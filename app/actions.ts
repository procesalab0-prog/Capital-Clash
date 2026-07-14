"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getProvider, isDemoMode } from "@/lib/data/provider";
import { DEMO_COOKIE, getSessionUserForRoute as getSessionUser } from "@/lib/session";
import {
  castVoteAndResolve,
  closeSeason,
  executeProposal,
  resolveGroupQuote,
} from "@/lib/game";
import { addDaysISO, todayISO } from "@/lib/format";
import type { GroupMode, TradeType, VoteValue } from "@/lib/types";

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

async function requireMembership(groupId: string) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const provider = await getProvider();
  const group = await provider.getGroup(groupId);
  if (!group) redirect("/grupos");
  const members = await provider.getMembers(groupId);
  const me = members.find((m) => m.userId === user.id);
  if (!me) redirect("/grupos");
  return { user, provider, group, members, role: me.role };
}

// ---------------------------------------------------------------------------
// Sesión
// ---------------------------------------------------------------------------

export async function demoLoginAction(formData: FormData) {
  if (!isDemoMode()) redirect("/login");
  const userId = String(formData.get("userId") ?? "");
  const { DEMO_USERS } = await import("@/lib/data/demo");
  if (!DEMO_USERS.some((u) => u.id === userId)) redirect("/login");
  const jar = await cookies();
  jar.set(DEMO_COOKIE, userId, { httpOnly: true, sameSite: "lax", path: "/" });
  redirect("/grupos");
}

export async function logoutAction() {
  if (isDemoMode()) {
    const jar = await cookies();
    jar.delete(DEMO_COOKIE);
  } else {
    const { supabaseSignOut } = await import("@/lib/data/supabase");
    await supabaseSignOut();
  }
  redirect("/");
}

// ---------------------------------------------------------------------------
// Grupos
// ---------------------------------------------------------------------------

export async function createGroupAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const name = String(formData.get("name") ?? "").trim();
  const mode = String(formData.get("mode") ?? "simulado") as GroupMode;
  if (!name) fail("/grupos", "El grupo necesita un nombre.");
  const provider = await getProvider();
  const group = await provider.createGroup(name, mode, user.id);
  revalidatePath("/grupos");
  redirect(`/g/${group.id}`);
}

export async function joinGroupAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const code = String(formData.get("code") ?? "").trim();
  if (!code) fail("/grupos", "Escribe el código de invitación.");
  const provider = await getProvider();
  const group = await provider.joinGroup(code, user.id);
  if (!group) fail("/grupos", `No existe ningún grupo con el código “${code}”.`);
  revalidatePath("/grupos");
  redirect(`/g/${group.id}`);
}

export async function updateGroupAction(groupId: string, formData: FormData) {
  const { provider, role } = await requireMembership(groupId);
  if (role !== "admin") fail(`/g/${groupId}`, "Solo el administrador puede editar el grupo.");
  const name = String(formData.get("name") ?? "").trim();
  const mode = String(formData.get("mode") ?? "") as GroupMode;
  if (!name) fail(`/g/${groupId}`, "El grupo necesita un nombre.");
  await provider.updateGroup(groupId, {
    name,
    mode: mode === "real" || mode === "simulado" ? mode : undefined,
  });
  revalidatePath(`/g/${groupId}`, "layout");
  redirect(`/g/${groupId}`);
}

export async function deleteGroupAction(groupId: string) {
  const { provider, role } = await requireMembership(groupId);
  if (role !== "admin") fail(`/g/${groupId}`, "Solo el administrador puede eliminar el grupo.");
  await provider.deleteGroup(groupId);
  revalidatePath("/grupos");
  redirect("/grupos");
}

// ---------------------------------------------------------------------------
// Mercado — acciones personalizadas
// ---------------------------------------------------------------------------

export async function createCustomTickerAction(groupId: string, formData: FormData) {
  const { user, provider } = await requireMembership(groupId);
  const path = `/g/${groupId}/mercado`;

  const ticker = String(formData.get("ticker") ?? "").trim().toUpperCase();
  const companyName = String(formData.get("companyName") ?? "").trim();
  const priceUsd = Number(formData.get("priceUsd"));

  if (!/^[A-Z0-9._-]{1,10}$/.test(ticker)) {
    fail(path, "El símbolo debe tener letras/números, máximo 10 caracteres.");
  }
  if (!companyName) fail(path, "Ponle un nombre a la empresa.");
  if (!Number.isFinite(priceUsd) || priceUsd <= 0) {
    fail(path, "El precio debe ser mayor a 0.");
  }

  const existing = await provider.getCustomTickers(groupId);
  if (existing.some((c) => c.ticker === ticker)) {
    fail(path, `Ya existe una acción personalizada con el símbolo “${ticker}”.`);
  }

  await provider.createCustomTicker({
    groupId,
    ticker,
    companyName,
    priceUsd,
    createdBy: user.id,
  });
  revalidatePath(`/g/${groupId}`, "layout");
  redirect(path);
}

// ---------------------------------------------------------------------------
// Temporadas
// ---------------------------------------------------------------------------

export async function createSeasonAction(groupId: string, formData: FormData) {
  const { provider, role, members } = await requireMembership(groupId);
  const path = `/g/${groupId}/temporada`;
  if (role !== "admin") fail(path, "Solo el administrador puede crear temporadas.");

  const seasons = await provider.getSeasons(groupId);
  if (seasons.some((s) => s.status === "active")) {
    fail(path, "Ya hay una temporada activa. Ciérrala antes de crear otra.");
  }
  const name =
    String(formData.get("name") ?? "").trim() ||
    `Temporada ${seasons.length + 1}`;
  const contribution = Number(formData.get("contribution"));
  const duration = Number(formData.get("duration") || 45);
  if (!Number.isFinite(contribution) || contribution <= 0) {
    fail(path, "La aportación por participante debe ser mayor a 0.");
  }
  const start = todayISO();
  await provider.createSeason({
    groupId,
    name,
    startDate: start,
    endDate: addDaysISO(start, Math.max(1, Math.round(duration))),
    contributionAmount: contribution,
    participantIds: members.map((m) => m.userId),
  });
  revalidatePath(`/g/${groupId}`, "layout");
  redirect(`/g/${groupId}`);
}

export async function closeSeasonAction(groupId: string, seasonId: string) {
  const { provider, role } = await requireMembership(groupId);
  const path = `/g/${groupId}/temporada`;
  if (role !== "admin") fail(path, "Solo el administrador puede cerrar la temporada.");
  const season = await provider.getSeason(seasonId);
  if (!season || season.status !== "active") {
    fail(path, "No hay una temporada activa que cerrar.");
  }
  await closeSeason(provider, season);
  revalidatePath(`/g/${groupId}`, "layout");
  redirect(`/g/${groupId}/ranking`);
}

// ---------------------------------------------------------------------------
// Propuestas y votación
// ---------------------------------------------------------------------------

export async function createProposalAction(
  groupId: string,
  seasonId: string,
  formData: FormData,
) {
  const { user, provider, group } = await requireMembership(groupId);
  const path = `/g/${groupId}/propuestas`;
  const season = await provider.getSeason(seasonId);
  if (!season || season.status !== "active") {
    fail(path, "La temporada no está activa.");
  }

  const type = String(formData.get("type") ?? "buy") as TradeType;
  const ticker = String(formData.get("ticker") ?? "").trim().toUpperCase();
  const companyName =
    String(formData.get("companyName") ?? "").trim() || ticker;
  const thesis = String(formData.get("thesis") ?? "").trim();
  if (!ticker) fail(path, "Elige una acción (ticker).");
  if (!thesis) fail(path, "Explica tu tesis: ¿por qué esta operación?");

  const transactions = await provider.getTransactions(seasonId);
  const participants = await provider.getParticipants(seasonId);
  const initialCapital = participants.reduce((s, p) => s + p.contribution, 0);

  let amountUsd: number | null = null;
  let shares: number | null = null;
  if (type === "buy") {
    amountUsd = Number(formData.get("amountUsd"));
    if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
      fail(path, "El monto a invertir debe ser mayor a 0.");
    }
    const cash = transactions.reduce(
      (c, tx) => c + (tx.type === "buy" ? -tx.total : tx.total),
      initialCapital,
    );
    if (amountUsd > cash + 0.01) {
      fail(
        path,
        `Efectivo insuficiente: el fondo tiene ${cash.toFixed(2)} USD disponibles.`,
      );
    }
  } else {
    shares = Number(formData.get("shares"));
    if (!Number.isFinite(shares) || shares <= 0) {
      fail(path, "El número de acciones a vender debe ser mayor a 0.");
    }
    const held = transactions
      .filter((tx) => tx.ticker === ticker)
      .reduce((s, tx) => s + (tx.type === "buy" ? tx.shares : -tx.shares), 0);
    if (shares > held + 1e-6) {
      fail(path, `Solo hay ${held.toFixed(4)} títulos de ${ticker} en cartera.`);
    }
  }

  const proposal = await provider.createProposal({
    seasonId,
    proposedBy: user.id,
    type,
    ticker,
    companyName,
    amountUsd,
    shares,
    thesis,
  });
  // Quien propone vota "sí" automáticamente.
  const result = await castVoteAndResolve(
    provider,
    group,
    season,
    proposal.id,
    user.id,
    "yes",
  );
  revalidatePath(`/g/${groupId}`, "layout");
  if (result.error) {
    fail(path, `Aprobada, pero no se pudo ejecutar: ${result.error}`);
  }
  redirect(path);
}

export async function editProposalAction(
  groupId: string,
  proposalId: string,
  formData: FormData,
) {
  const { user, provider, role } = await requireMembership(groupId);
  const path = `/g/${groupId}/propuestas`;
  const proposal = await provider.getProposal(proposalId);
  if (!proposal) fail(path, "Propuesta no encontrada.");
  if (proposal.status !== "pending") {
    fail(path, "Solo se pueden editar propuestas en votación.");
  }
  if (proposal.proposedBy !== user.id && role !== "admin") {
    fail(path, "Solo quien propuso (o el admin) puede editar la propuesta.");
  }

  const thesis = String(formData.get("thesis") ?? "").trim();
  if (!thesis) fail(path, "La tesis no puede quedar vacía.");

  const fields: { amountUsd?: number | null; shares?: number | null; thesis: string } = {
    thesis,
  };
  if (proposal.type === "buy") {
    const amountUsd = Number(formData.get("amountUsd"));
    if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
      fail(path, "El monto a invertir debe ser mayor a 0.");
    }
    fields.amountUsd = amountUsd;
  } else {
    const shares = Number(formData.get("shares"));
    if (!Number.isFinite(shares) || shares <= 0) {
      fail(path, "El número de acciones debe ser mayor a 0.");
    }
    fields.shares = shares;
  }

  await provider.updateProposal(proposalId, fields);
  // Cambiaron los términos: se reinicia la votación y quien propone vuelve a
  // votar "sí".
  await provider.clearVotes(proposalId);
  await provider.castVote(proposalId, user.id, "yes");
  revalidatePath(`/g/${groupId}`, "layout");
  redirect(path);
}

export async function deleteProposalAction(groupId: string, proposalId: string) {
  const { user, provider, role } = await requireMembership(groupId);
  const path = `/g/${groupId}/propuestas`;
  const proposal = await provider.getProposal(proposalId);
  if (!proposal) fail(path, "Propuesta no encontrada.");
  if (proposal.status === "executed") {
    fail(path, "No se puede eliminar una propuesta ya ejecutada (rompería el historial).");
  }
  if (proposal.proposedBy !== user.id && role !== "admin") {
    fail(path, "Solo quien propuso (o el admin) puede eliminar la propuesta.");
  }
  await provider.deleteProposal(proposalId);
  revalidatePath(`/g/${groupId}`, "layout");
  redirect(path);
}

export async function voteAction(
  groupId: string,
  proposalId: string,
  value: VoteValue,
) {
  const { user, provider, group } = await requireMembership(groupId);
  const path = `/g/${groupId}/propuestas`;
  const proposal = await provider.getProposal(proposalId);
  if (!proposal || proposal.status !== "pending") {
    fail(path, "Esta propuesta ya no está abierta a votación.");
  }
  const season = await provider.getSeason(proposal.seasonId);
  if (!season || season.status !== "active") fail(path, "La temporada no está activa.");
  const participants = await provider.getParticipants(season.id);
  if (!participants.some((p) => p.userId === user.id)) {
    fail(path, "Solo los participantes de la temporada pueden votar.");
  }
  const result = await castVoteAndResolve(
    provider,
    group,
    season,
    proposalId,
    user.id,
    value,
  );
  revalidatePath(`/g/${groupId}`, "layout");
  if (result.error) fail(path, `Aprobada, pero no se pudo ejecutar: ${result.error}`);
  redirect(path);
}

/**
 * Ejecución manual de una propuesta aprobada (grupos en modo "real"):
 * el admin confirma el precio al que realmente se ejecutó en el broker.
 */
export async function executeApprovedAction(
  groupId: string,
  proposalId: string,
  formData: FormData,
) {
  const { provider, role } = await requireMembership(groupId);
  const path = `/g/${groupId}/propuestas`;
  if (role !== "admin") {
    fail(path, "Solo el administrador registra la ejecución real.");
  }
  const proposal = await provider.getProposal(proposalId);
  if (!proposal || proposal.status !== "approved") {
    fail(path, "La propuesta no está aprobada.");
  }
  const season = await provider.getSeason(proposal.seasonId);
  if (!season) fail(path, "Temporada no encontrada.");

  let price = Number(formData.get("price"));
  if (!Number.isFinite(price) || price <= 0) {
    price = (await resolveGroupQuote(provider, groupId, proposal.ticker)).price;
  }
  const result = await executeProposal(provider, proposal, season, price);
  revalidatePath(`/g/${groupId}`, "layout");
  if (!result.ok) fail(path, result.error ?? "No se pudo ejecutar.");
  redirect(path);
}
