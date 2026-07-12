import { getFundSeries, getGroupContext } from "@/lib/loaders";
import { computeSeasonStats, computeStandings } from "@/lib/portfolio";
import { fmtDate, fmtMoney, fmtPct } from "@/lib/format";
import { Badge, Card, EmptyState, PageTitle, PnlText, StatCard } from "@/components/ui";

const medals = ["🥇", "🥈", "🥉"];

export default async function RankingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getGroupContext(id);
  const { season, seasons, summary, participants, transactions, proposals, quotes, members } = ctx;

  if (!season || !summary) {
    return (
      <EmptyState
        title="Sin temporada"
        hint="El ranking se calcula con las operaciones de la temporada."
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
  );
  const series = await getFundSeries(ctx);
  const stats = computeSeasonStats(transactions, quotes, series);
  const nameOf = (userId: string) =>
    members.find((m) => m.userId === userId)?.profile.displayName ?? "—";

  const podium = standings.slice(0, 3);
  const isClosed = season.status === "closed";

  return (
    <div className="grid gap-6">
      <PageTitle
        title={isClosed ? `Ranking final · ${season.name}` : `Ranking en vivo · ${season.name}`}
        subtitle={
          isClosed
            ? `Temporada cerrada el ${season.closedAt ? fmtDate(season.closedAt.slice(0, 10)) : ""} con ${fmtMoney(season.finalValue ?? 0)}.`
            : "La puntuación es el rendimiento de tus propuestas ejecutadas más un bono por puntería al votar."
        }
      />

      {/* Podio */}
      <div className="grid gap-3 sm:grid-cols-3">
        {podium.map((s, i) => (
          <Card
            key={s.userId}
            className={i === 0 ? "border-accent sm:-translate-y-1" : ""}
          >
            <p className="text-3xl">{medals[i]}</p>
            <p className="mt-1 text-lg font-bold">{s.displayName}</p>
            <p className="text-sm text-ink2">
              {s.proposalsExecuted > 0 && s.proposalsReturnPct !== null ? (
                <>
                  Sus propuestas: <PnlText pct={s.proposalsReturnPct} />
                </>
              ) : (
                "Sin propuestas ejecutadas aún"
              )}
            </p>
            <p className="figures mt-1 text-xs text-muted">
              Puntuación: {s.score.toFixed(1)}
            </p>
          </Card>
        ))}
      </div>

      {/* Tabla completa */}
      <Card className="overflow-x-auto p-0 sm:p-0">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-muted">
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">Jugador</th>
              <th className="px-4 py-3 text-right font-medium">Sus propuestas</th>
              <th className="px-4 py-3 text-right font-medium">Puntería de voto</th>
              <th className="px-4 py-3 text-right font-medium">Puntuación</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((s, i) => (
              <tr key={s.userId} className="border-b border-line last:border-0">
                <td className="figures px-4 py-3">{i + 1}</td>
                <td className="px-4 py-3 font-medium">{s.displayName}</td>
                <td className="px-4 py-3 text-right">
                  {s.proposalsReturnPct === null ? (
                    <span className="text-muted">—</span>
                  ) : (
                    <PnlText pct={s.proposalsReturnPct} />
                  )}
                </td>
                <td className="figures px-4 py-3 text-right">
                  {s.voteAccuracyPct === null ? "—" : `${s.voteAccuracyPct.toFixed(0)}%`}
                </td>
                <td className="figures px-4 py-3 text-right font-semibold">
                  {s.score.toFixed(1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Estadísticas de la temporada */}
      <div>
        <h2 className="mb-3 font-semibold">Estadísticas de la temporada</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <p className="text-sm text-ink2">Mejor inversión</p>
            {stats.bestTrade ? (
              <>
                <p className="figures mt-1 text-xl font-semibold">
                  {stats.bestTrade.ticker}
                </p>
                <p className="text-sm">
                  <PnlText pct={stats.bestTrade.returnPct} /> ·{" "}
                  <span className="text-muted">{nameOf(stats.bestTrade.proposedBy)}</span>
                </p>
              </>
            ) : (
              <p className="mt-1 text-muted">—</p>
            )}
          </Card>
          <Card>
            <p className="text-sm text-ink2">Peor inversión</p>
            {stats.worstTrade ? (
              <>
                <p className="figures mt-1 text-xl font-semibold">
                  {stats.worstTrade.ticker}
                </p>
                <p className="text-sm">
                  <PnlText pct={stats.worstTrade.returnPct} /> ·{" "}
                  <span className="text-muted">{nameOf(stats.worstTrade.proposedBy)}</span>
                </p>
              </>
            ) : (
              <p className="mt-1 text-muted">—</p>
            )}
          </Card>
          <StatCard
            label="Rendimiento promedio por compra"
            value={stats.avgTradeReturnPct === null ? "—" : fmtPct(stats.avgTradeReturnPct)}
          />
          <Card>
            <p className="text-sm text-ink2">Fondo vs S&P 500</p>
            <p className="mt-1 text-xl font-semibold">
              <PnlText pct={summary.totalReturnPct} />
            </p>
            <p className="text-sm text-muted">
              S&P 500 en el periodo:{" "}
              {stats.benchmarkReturnPct === null ? "—" : fmtPct(stats.benchmarkReturnPct)}
            </p>
          </Card>
        </div>
      </div>

      {/* Historial de temporadas */}
      {seasons.length > 1 && (
        <div>
          <h2 className="mb-3 font-semibold">Historial de temporadas</h2>
          <div className="grid gap-2">
            {seasons.map((s) => (
              <Card key={s.id} className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">{s.name}</span>
                <span className="text-sm text-muted">
                  {fmtDate(s.startDate)} → {fmtDate(s.endDate)}
                </span>
                <Badge tone={s.status === "active" ? "gain" : "neutral"}>
                  {s.status === "active" ? "Activa" : s.status === "closed" ? "Cerrada" : "Borrador"}
                </Badge>
                {s.status === "closed" && s.finalValue !== null && (
                  <span className="figures text-sm">{fmtMoney(s.finalValue)}</span>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
