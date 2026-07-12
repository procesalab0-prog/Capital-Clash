import type { DataProvider, ProposalWithVotes } from "./data/provider";
import { computeSummary } from "./portfolio";
import { getQuote, getQuotes, BENCHMARK_TICKER } from "./prices";
import { todayISO } from "./format";
import type { Group, Quote, Season, Transaction } from "./types";

/**
 * Reglas del juego, compartidas por el modo demo y el modo Supabase.
 */

/** Votos "sí" necesarios para aprobar: mayoría estricta (>50%). */
export function votesNeeded(participantCount: number): number {
  return Math.floor(participantCount / 2) + 1;
}

export interface VoteState {
  yes: number;
  no: number;
  needed: number;
  participantCount: number;
  /** Ya es matemáticamente imposible alcanzar la mayoría. */
  unreachable: boolean;
}

export function voteState(
  proposal: ProposalWithVotes,
  participantCount: number,
): VoteState {
  const yes = proposal.votes.filter((v) => v.value === "yes").length;
  const no = proposal.votes.filter((v) => v.value === "no").length;
  const needed = votesNeeded(participantCount);
  return {
    yes,
    no,
    needed,
    participantCount,
    unreachable: participantCount - no < needed,
  };
}

/** Marca como expiradas las propuestas pendientes cuyo plazo venció. */
export async function sweepExpiredProposals(
  provider: DataProvider,
  proposals: ProposalWithVotes[],
): Promise<ProposalWithVotes[]> {
  const now = new Date().toISOString();
  for (const p of proposals) {
    if (p.status === "pending" && p.expiresAt < now) {
      await provider.setProposalStatus(p.id, "expired");
      p.status = "expired";
    }
  }
  return proposals;
}

export interface ExecutionResult {
  ok: boolean;
  error?: string;
  transaction?: Transaction;
}

/**
 * Ejecuta una propuesta aprobada a un precio dado.
 * Valida efectivo disponible (compras) y acciones en cartera (ventas).
 */
export async function executeProposal(
  provider: DataProvider,
  proposal: ProposalWithVotes,
  season: Season,
  price: number,
): Promise<ExecutionResult> {
  const transactions = await provider.getTransactions(season.id);
  const participants = await provider.getParticipants(season.id);
  const initialCapital = participants.reduce((s, p) => s + p.contribution, 0);

  if (price <= 0) return { ok: false, error: "Precio inválido." };

  let shares: number;
  if (proposal.type === "buy") {
    const cash = transactions.reduce(
      (c, tx) => c + (tx.type === "buy" ? -tx.total : tx.total),
      initialCapital,
    );
    const amount = proposal.amountUsd ?? 0;
    if (amount <= 0) return { ok: false, error: "Monto inválido." };
    if (amount > cash + 0.01) {
      return {
        ok: false,
        error: `Efectivo insuficiente: hay ${cash.toFixed(2)} USD disponibles.`,
      };
    }
    shares = Math.round((amount / price) * 10000) / 10000;
  } else {
    const held = transactions
      .filter((tx) => tx.ticker === proposal.ticker)
      .reduce((s, tx) => s + (tx.type === "buy" ? tx.shares : -tx.shares), 0);
    shares = proposal.shares ?? 0;
    if (shares <= 0) return { ok: false, error: "Número de acciones inválido." };
    if (shares > held + 1e-6) {
      return {
        ok: false,
        error: `Solo hay ${held.toFixed(4)} acciones de ${proposal.ticker} en cartera.`,
      };
    }
  }

  const total = Math.round(shares * price * 100) / 100;
  const transaction = await provider.addTransaction({
    seasonId: season.id,
    proposalId: proposal.id,
    proposedBy: proposal.proposedBy,
    type: proposal.type,
    ticker: proposal.ticker,
    companyName: proposal.companyName,
    shares,
    price,
    total,
  });
  await provider.setProposalStatus(proposal.id, "executed");
  return { ok: true, transaction };
}

/**
 * Registra un voto y resuelve la propuesta:
 * - mayoría de "sí" → aprobada; en grupos simulados se ejecuta al instante
 *   a precio de mercado; en grupos reales queda "approved" hasta que el
 *   admin confirme el precio real de su broker.
 * - mayoría imposible → rechazada.
 */
export async function castVoteAndResolve(
  provider: DataProvider,
  group: Group,
  season: Season,
  proposalId: string,
  userId: string,
  value: "yes" | "no",
): Promise<{ resolved: "approved" | "rejected" | "executed" | null; error?: string }> {
  await provider.castVote(proposalId, userId, value);
  const proposal = await provider.getProposal(proposalId);
  if (!proposal || proposal.status !== "pending") return { resolved: null };

  const participants = await provider.getParticipants(season.id);
  const state = voteState(proposal, participants.length);

  if (state.yes >= state.needed) {
    await provider.setProposalStatus(proposalId, "approved");
    if (group.mode === "simulado") {
      const quote = await getQuote(proposal.ticker);
      const result = await executeProposal(provider, proposal, season, quote.price);
      if (!result.ok) return { resolved: "approved", error: result.error };
      return { resolved: "executed" };
    }
    return { resolved: "approved" };
  }
  if (state.unreachable) {
    await provider.setProposalStatus(proposalId, "rejected");
    return { resolved: "rejected" };
  }
  return { resolved: null };
}

/**
 * Cierra la temporada: vende todas las posiciones a precio actual,
 * guarda el valor final y marca la temporada como cerrada.
 */
export async function closeSeason(
  provider: DataProvider,
  season: Season,
): Promise<{ finalValue: number }> {
  const transactions = await provider.getTransactions(season.id);
  const participants = await provider.getParticipants(season.id);
  const initialCapital = participants.reduce((s, p) => s + p.contribution, 0);

  const holdings = new Map<string, { shares: number; name: string }>();
  for (const tx of transactions) {
    const h = holdings.get(tx.ticker) ?? { shares: 0, name: tx.companyName };
    h.shares += tx.type === "buy" ? tx.shares : -tx.shares;
    holdings.set(tx.ticker, h);
  }
  const open = [...holdings.entries()].filter(([, h]) => h.shares > 1e-9);
  const quotes = await getQuotes(open.map(([t]) => t));

  for (const [ticker, h] of open) {
    const price = quotes.get(ticker)!.price;
    await provider.addTransaction({
      seasonId: season.id,
      proposalId: null,
      proposedBy: null,
      type: "sell",
      ticker,
      companyName: h.name,
      shares: h.shares,
      price,
      total: Math.round(h.shares * price * 100) / 100,
    });
  }

  const finalTx = await provider.getTransactions(season.id);
  const cash = finalTx.reduce(
    (c, tx) => c + (tx.type === "buy" ? -tx.total : tx.total),
    initialCapital,
  );
  const finalValue = Math.round(cash * 100) / 100;
  await provider.setSeasonStatus(season.id, "closed", finalValue);
  return { finalValue };
}

/**
 * Snapshot diario del valor del fondo (para la gráfica y el Índice
 * Capital Clash) — se hace al cargar el dashboard, sin cron.
 */
export async function ensureDailySnapshot(
  provider: DataProvider,
  season: Season,
  transactions: Transaction[],
  quotes: Map<string, Quote>,
  initialCapital: number,
): Promise<void> {
  const summary = computeSummary(transactions, quotes, initialCapital);
  const bench = await getQuote(BENCHMARK_TICKER);
  await provider.upsertSnapshot(season.id, {
    date: todayISO(),
    fundValue: summary.fundValue,
    benchmarkValue: bench.price,
  });
}
