import { getGroupContext } from "@/lib/loaders";
import { computeStandings } from "@/lib/portfolio";
import { fmtMoney, fmtPct } from "@/lib/format";
import {
  Avatar,
  Badge,
  Card,
  EmptyState,
  PageTitle,
  PnlText,
} from "@/components/ui";

export default async function ParticipantsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getGroupContext(id);
  const { season, summary, participants, transactions, proposals, quotes, members } = ctx;

  if (!season || !summary) {
    return (
      <EmptyState
        title="Sin temporada"
        hint="Los participantes y sus aportaciones se definen al crear una temporada."
      />
    );
  }

  const votes = proposals.flatMap((p) => p.votes);
  const standings = computeStandings(
    participants,
    transactions,
    votes,
    quotes,
    summary,
  ).sort((a, b) => a.displayName.localeCompare(b.displayName));

  const roleOf = (userId: string) =>
    members.find((m) => m.userId === userId)?.role ?? "member";

  return (
    <div>
      <PageTitle
        title="Participantes"
        subtitle={`${participants.length} ${participants.length === 1 ? "jugador" : "jugadores"} · aportación de ${fmtMoney(season.contributionAmount)} cada uno.`}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {standings.map((s) => (
          <Card key={s.userId}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <Avatar userId={s.userId} name={s.displayName} size={44} />
                <div>
                  <p className="font-extrabold">{s.displayName}</p>
                  <p className="text-xs font-semibold text-muted">
                    {fmtMoney(s.contribution)} aportados ·{" "}
                    {s.sharePct.toFixed(1)}% del fondo
                  </p>
                </div>
              </div>
              {roleOf(s.userId) === "admin" && <Badge tone="accent">Admin</Badge>}
            </div>
            <dl className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
              <div className="rounded-xl border-[2.5px] border-line px-2 py-2.5">
                <dt className="text-[10px] font-bold uppercase tracking-wide text-muted">
                  Su parte hoy
                </dt>
                <dd className="figures mt-1">{fmtMoney(s.currentShareValue)}</dd>
              </div>
              <div className="rounded-xl border-[2.5px] border-line px-2 py-2.5">
                <dt className="text-[10px] font-bold uppercase tracking-wide text-muted">
                  Sus propuestas
                </dt>
                <dd className="mt-1 font-extrabold">
                  {s.proposalsExecuted === 0 ? (
                    <span className="text-muted">—</span>
                  ) : (
                    <PnlText pct={s.proposalsReturnPct ?? 0} />
                  )}
                </dd>
              </div>
              <div className="rounded-xl border-[2.5px] border-line px-2 py-2.5">
                <dt className="text-[10px] font-bold uppercase tracking-wide text-muted">
                  Puntería
                </dt>
                <dd className="figures mt-1">
                  {s.voteAccuracyPct === null
                    ? "—"
                    : `${s.voteAccuracyPct.toFixed(0)}%`}
                </dd>
              </div>
            </dl>
          </Card>
        ))}
      </div>
      <p className="mt-4 text-xs font-semibold text-muted">
        “Sus propuestas” es el rendimiento ponderado de las compras que esa
        persona propuso y el grupo ejecutó. “Puntería” mide cuántos de sus
        votos coincidieron con el resultado. Rendimiento del fondo:{" "}
        {fmtPct(summary.totalReturnPct)}.
      </p>
    </div>
  );
}
