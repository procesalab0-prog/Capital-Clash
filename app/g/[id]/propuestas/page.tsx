import Link from "next/link";
import {
  createProposalAction,
  executeApprovedAction,
  voteAction,
} from "@/app/actions";
import { getGroupContext } from "@/lib/loaders";
import { votesNeeded, voteState } from "@/lib/game";
import { fmtMoney, fmtShares } from "@/lib/format";
import type { ProposalWithVotes } from "@/lib/data/provider";
import {
  Badge,
  btnGain,
  btnGhost,
  btnPrimary,
  Card,
  DualPrice,
  inputCls,
  PageTitle,
} from "@/components/ui";
import { ProposalForm } from "@/components/ProposalForm";
import { ProposalActions } from "@/components/ProposalActions";

function hoursLeft(expiresAt: string): number {
  return Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 3600_000));
}

const statusBadge: Record<
  string,
  { label: string; tone: "neutral" | "accent" | "gain" | "loss" | "warn" | "ink" }
> = {
  pending: { label: "En votación", tone: "warn" },
  approved: { label: "Aprobada · por ejecutar", tone: "ink" },
  executed: { label: "Ejecutada", tone: "gain" },
  rejected: { label: "Rechazada", tone: "loss" },
  expired: { label: "Expirada", tone: "neutral" },
};

export default async function ProposalsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ticker?: string; name?: string }>;
}) {
  const { id } = await params;
  const { error, ticker: initialTicker, name: initialName } = await searchParams;
  const ctx = await getGroupContext(id);
  const { group, season, proposals, participants, positions, summary, quotes, user, role } = ctx;

  if (!season || season.status !== "active" || !summary) {
    return (
      <PageTitle
        title="Propuestas"
        subtitle="Necesitan una temporada activa para proponer inversiones."
      />
    );
  }

  const pending = proposals.filter((p) => p.status === "pending");
  const approved = proposals.filter((p) => p.status === "approved");
  const resolved = proposals.filter(
    (p) => !["pending", "approved"].includes(p.status),
  );

  const memberNames = new Map(
    ctx.members.map((m) => [m.userId, m.profile.displayName]),
  );

  function VoteCard({ p }: { p: ProposalWithVotes }) {
    const st = voteState(p, participants.length);
    const myVote = p.votes.find((v) => v.userId === user.id)?.value ?? null;
    const oneAway = p.status === "pending" && st.needed - st.yes === 1;
    return (
      <div
        className={`rounded-2xl border-[3px] bg-surface p-4 sm:p-5 ${
          oneAway
            ? "cc-wiggle border-accent shadow-[4px_4px_0_var(--accent)]"
            : "hard-shadow border-line"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge tone="ink">{p.type === "buy" ? "Compra" : "Venta"}</Badge>
            <span className="figures text-lg font-extrabold">{p.ticker}</span>
            <span className="hidden text-sm font-semibold text-ink2 sm:inline">
              {p.companyName}
            </span>
          </div>
          <Badge tone={statusBadge[p.status].tone}>
            {statusBadge[p.status].label}
          </Badge>
        </div>
        <div className="mt-2.5 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
          <span className="figures text-sm">
            {p.type === "buy"
              ? `Invertir ${fmtMoney(p.amountUsd ?? 0)}`
              : `Vender ${fmtShares(p.shares ?? 0)} títulos`}
          </span>
          {quotes.get(p.ticker) && (
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
                Precio actual
              </p>
              <DualPrice usd={quotes.get(p.ticker)!.priceUsd} size="sm" />
            </div>
          )}
        </div>
        <p className="mt-2 text-sm font-semibold italic leading-relaxed text-ink2">
          “{p.thesis}”
        </p>
        <p className="mt-1.5 text-xs font-bold text-muted">
          — {p.proposerName}
          {p.status === "pending" && ` · expira en ${hoursLeft(p.expiresAt)} h`}
        </p>

        <div className="mt-3">
          <div
            className="h-2.5 overflow-hidden rounded-full border-2 border-line bg-bg"
            role="progressbar"
            aria-valuenow={st.yes}
            aria-valuemin={0}
            aria-valuemax={st.needed}
          >
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${Math.min(100, (st.yes / st.needed) * 100)}%` }}
            />
          </div>
          <div className="mt-1.5 flex flex-wrap justify-between gap-1 text-xs font-bold text-muted">
            <span>
              {st.yes}/{st.needed} votos “sí”
              {st.no > 0 && ` · ${st.no} en contra`}
            </span>
            {oneAway && (
              <span className="font-black text-accent">
                ¡A 1 voto de aprobarse! 🔥
              </span>
            )}
          </div>
          <p className="mt-2 text-xs font-semibold text-muted">
            {p.votes
              .map(
                (v) =>
                  `${memberNames.get(v.userId) ?? "?"} ${v.value === "yes" ? "✓ sí" : "✗ no"}`,
              )
              .join(" · ") || "Nadie ha votado todavía."}
          </p>
        </div>

        {p.status === "pending" &&
          (myVote ? (
            <p className="mt-3 text-sm font-bold">
              Tu voto: {myVote === "yes" ? "✓ sí" : "✗ no"}
            </p>
          ) : (
            <div className="mt-4 flex gap-2.5">
              <form action={voteAction.bind(null, group.id, p.id, "no")} className="flex-1">
                <button className={`${btnGhost} w-full`}>Votar no ✗</button>
              </form>
              <form action={voteAction.bind(null, group.id, p.id, "yes")} className="flex-1">
                <button className={`${btnGain} w-full`}>Votar sí ✓</button>
              </form>
            </div>
          ))}

        {p.status === "approved" && group.mode === "real" && (
          <div className="mt-3 rounded-xl border-[2.5px] border-dashed border-line p-3">
            {role === "admin" ? (
              <form
                action={executeApprovedAction.bind(null, group.id, p.id)}
                className="flex flex-wrap items-center gap-2"
              >
                <input
                  className={`${inputCls} w-40`}
                  name="price"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="Precio ejecutado"
                />
                <button className={btnPrimary}>Registrar ejecución</button>
                <p className="w-full text-xs font-semibold text-muted">
                  Ejecuta la orden en su broker y registra aquí el precio real
                  (vacío = precio de mercado actual).
                </p>
              </form>
            ) : (
              <p className="text-xs font-semibold text-muted">
                Aprobada por el grupo. El administrador registrará la ejecución
                real del broker.
              </p>
            )}
          </div>
        )}

        {p.status !== "executed" &&
          (p.proposedBy === user.id || role === "admin") && (
            <ProposalActions
              groupId={group.id}
              proposalId={p.id}
              type={p.type}
              amountUsd={p.amountUsd}
              shares={p.shares}
              thesis={p.thesis}
              canEdit={p.status === "pending"}
            />
          )}
      </div>
    );
  }

  return (
    <div>
      <PageTitle
        title="Propuestas"
        subtitle={`Mayoría necesaria: ${votesNeeded(participants.length)} de ${participants.length} ${participants.length === 1 ? "jugador" : "jugadores"}.`}
      />
      {error && (
        <p className="hard-shadow-sm mb-4 rounded-xl border-[3px] border-loss bg-surface px-3 py-2 text-sm font-bold text-loss">
          ⚠ {decodeURIComponent(error)}
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="grid content-start gap-5">
          {approved.map((p) => (
            <VoteCard key={p.id} p={p} />
          ))}
          {pending.length === 0 && approved.length === 0 ? (
            <Card className="py-8 text-center text-sm font-bold text-muted">
              No hay propuestas en votación. ¡Lanza la primera!
            </Card>
          ) : (
            pending.map((p) => <VoteCard key={p.id} p={p} />)
          )}

          {resolved.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-sm font-extrabold text-ink2">
                Historial de propuestas ({resolved.length})
              </summary>
              <div className="mt-4 grid gap-5">
                {resolved.map((p) => (
                  <VoteCard key={p.id} p={p} />
                ))}
              </div>
            </details>
          )}
        </div>

        <div>
          <Card>
            <h2 className="mb-3 font-extrabold">Nueva propuesta</h2>
            <ProposalForm
              action={createProposalAction.bind(null, group.id, season.id)}
              positions={positions.map((p) => ({
                ticker: p.ticker,
                companyName: p.companyName,
                shares: p.shares,
              }))}
              cash={summary.cash}
              groupId={group.id}
              initialTicker={initialTicker}
              initialName={initialName}
              customTickers={ctx.customTickers.map((c) => ({
                ticker: c.ticker,
                name: c.companyName,
              }))}
            />
          </Card>
          <p className="mt-3 text-center text-xs font-semibold text-muted">
            ¿No aparece la empresa que buscas?{" "}
            <Link href={`/g/${group.id}/mercado`} className="font-bold text-accent hover:underline">
              Créala en Mercado →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
