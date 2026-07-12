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
  btnGhost,
  btnPrimary,
  Card,
  inputCls,
  PageTitle,
} from "@/components/ui";
import { ProposalForm } from "@/components/ProposalForm";

function hoursLeft(expiresAt: string): number {
  return Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 3600_000));
}

const statusBadge: Record<string, { label: string; tone: "neutral" | "accent" | "gain" | "loss" | "warn" }> = {
  pending: { label: "En votación", tone: "warn" },
  approved: { label: "Aprobada · por ejecutar", tone: "accent" },
  executed: { label: "Ejecutada", tone: "gain" },
  rejected: { label: "Rechazada", tone: "loss" },
  expired: { label: "Expirada", tone: "neutral" },
};

export default async function ProposalsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const ctx = await getGroupContext(id);
  const { group, season, proposals, participants, positions, summary, user, role } = ctx;

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
      <Card className={oneAway ? "border-accent" : ""}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge tone={p.type === "buy" ? "accent" : "neutral"}>
              {p.type === "buy" ? "Compra" : "Venta"}
            </Badge>
            <span className="figures text-lg font-bold">{p.ticker}</span>
            <span className="text-sm text-ink2">{p.companyName}</span>
          </div>
          <Badge tone={statusBadge[p.status].tone}>{statusBadge[p.status].label}</Badge>
        </div>
        <p className="figures mt-2 text-sm">
          {p.type === "buy"
            ? `Invertir ${fmtMoney(p.amountUsd ?? 0)}`
            : `Vender ${fmtShares(p.shares ?? 0)} títulos`}
        </p>
        <p className="mt-2 text-sm text-ink2">“{p.thesis}”</p>
        <p className="mt-1 text-xs text-muted">
          Propone {p.proposerName}
          {p.status === "pending" && ` · expira en ${hoursLeft(p.expiresAt)} h`}
        </p>

        <div className="mt-3">
          <div className="mb-1 flex justify-between text-xs text-ink2">
            <span>
              {st.yes} de {st.needed} votos “sí” necesarios
              {oneAway && (
                <span className="ml-1 font-semibold text-accent">
                  · ¡a 1 voto de aprobarse!
                </span>
              )}
            </span>
            <span>
              {st.no > 0 && `${st.no} en contra`}
            </span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-line"
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
          <p className="mt-2 text-xs text-muted">
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
            <p className="mt-3 text-sm text-ink2">
              Tu voto: {myVote === "yes" ? "✓ sí" : "✗ no"}
            </p>
          ) : (
            <div className="mt-3 flex gap-2">
              <form action={voteAction.bind(null, group.id, p.id, "yes")}>
                <button className={btnPrimary}>Votar sí ✓</button>
              </form>
              <form action={voteAction.bind(null, group.id, p.id, "no")}>
                <button className={btnGhost}>Votar no ✗</button>
              </form>
            </div>
          ))}

        {p.status === "approved" && group.mode === "real" && (
          <div className="mt-3 rounded-lg border border-accent/40 p-3">
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
                <p className="w-full text-xs text-muted">
                  Ejecuta la orden en su broker y registra aquí el precio real
                  (vacío = precio de mercado actual).
                </p>
              </form>
            ) : (
              <p className="text-xs text-muted">
                Aprobada por el grupo. El administrador registrará la ejecución
                real del broker.
              </p>
            )}
          </div>
        )}
      </Card>
    );
  }

  return (
    <div>
      <PageTitle
        title="Propuestas"
        subtitle={`Mayoría necesaria: ${votesNeeded(participants.length)} de ${participants.length} participantes.`}
      />
      {error && (
        <p className="mb-4 rounded-lg border border-loss/40 bg-loss/10 px-3 py-2 text-sm text-loss">
          ⚠ {decodeURIComponent(error)}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="grid content-start gap-4">
          {approved.map((p) => (
            <VoteCard key={p.id} p={p} />
          ))}
          {pending.length === 0 && approved.length === 0 ? (
            <Card className="py-8 text-center text-sm text-muted">
              No hay propuestas en votación. ¡Lanza la primera!
            </Card>
          ) : (
            pending.map((p) => <VoteCard key={p.id} p={p} />)
          )}

          {resolved.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-sm font-medium text-ink2">
                Propuestas anteriores ({resolved.length})
              </summary>
              <div className="mt-3 grid gap-4">
                {resolved.map((p) => (
                  <VoteCard key={p.id} p={p} />
                ))}
              </div>
            </details>
          )}
        </div>

        <div>
          <Card>
            <h2 className="mb-3 font-semibold">Nueva propuesta</h2>
            <ProposalForm
              action={createProposalAction.bind(null, group.id, season.id)}
              positions={positions.map((p) => ({
                ticker: p.ticker,
                companyName: p.companyName,
                shares: p.shares,
              }))}
              cash={summary.cash}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
