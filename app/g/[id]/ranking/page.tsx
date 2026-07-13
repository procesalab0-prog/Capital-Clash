import { getFundSeries, getGroupContext } from "@/lib/loaders";
import { computeSeasonStats, computeStandings } from "@/lib/portfolio";
import { fmtDate, fmtMoney, fmtPct } from "@/lib/format";
import type { ParticipantStanding } from "@/lib/types";
import {
  Avatar,
  Badge,
  Card,
  EmptyState,
  PageTitle,
  PnlText,
  StatCard,
} from "@/components/ui";

const confettiPieces = [
  { top: 0, left: "8%", color: "var(--accent)", delay: "0s" },
  { top: 18, left: "22%", color: "var(--yellow)", delay: "0.5s" },
  { top: 6, left: "38%", color: "var(--blue)", delay: "1s" },
  { top: 24, left: "52%", color: "var(--gain)", delay: "0.3s" },
  { top: 10, left: "68%", color: "var(--accent)", delay: "0.8s" },
  { top: 2, left: "82%", color: "var(--yellow)", delay: "1.2s" },
  { top: 20, left: "93%", color: "var(--blue)", delay: "0.6s" },
];

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

  const isClosed = season.status === "closed";
  const podium = standings.slice(0, 3);
  const rest = standings.slice(3);

  // Orden visual del podio: 2º · 1º · 3º
  const podiumOrder: { s: ParticipantStanding; place: number }[] = [];
  if (podium[1]) podiumOrder.push({ s: podium[1], place: 2 });
  if (podium[0]) podiumOrder.push({ s: podium[0], place: 1 });
  if (podium[2]) podiumOrder.push({ s: podium[2], place: 3 });

  const blockHeight: Record<number, number> = { 1: 96, 2: 66, 3: 50 };
  const placeColor: Record<number, string> = {
    1: "var(--gold)",
    2: "var(--muted)",
    3: "var(--bronze)",
  };

  return (
    <div className="grid gap-6">
      <PageTitle
        title={isClosed ? `Ranking final · ${season.name}` : `Ranking en vivo · ${season.name}`}
        subtitle={
          isClosed
            ? `Temporada cerrada el ${season.closedAt ? fmtDate(season.closedAt.slice(0, 10)) : ""} con ${fmtMoney(season.finalValue ?? 0)}. 🎉`
            : "La puntuación es el rendimiento de tus propuestas ejecutadas más un bono por puntería al votar."
        }
      />

      {/* Podio */}
      <Card className="relative overflow-hidden">
        {isClosed &&
          confettiPieces.map((c, i) => (
            <span
              key={i}
              aria-hidden
              className="cc-confetti absolute h-3 w-2 rounded-sm border-[1.5px] border-line"
              style={{
                top: c.top,
                left: c.left,
                background: c.color,
                animationDelay: c.delay,
              }}
            />
          ))}
        <div className="relative z-10 flex items-end justify-center gap-3 pt-2 sm:gap-5">
          {podiumOrder.map(({ s, place }) => (
            <div key={s.userId} className="flex w-24 flex-col items-center gap-1.5 sm:w-28">
              {place === 1 && (
                <span aria-hidden className="cc-crown text-2xl leading-none">
                  👑
                </span>
              )}
              <Avatar
                userId={s.userId}
                name={s.displayName}
                size={place === 1 ? 52 : 42}
              />
              <p className={`font-extrabold ${place === 1 ? "text-sm" : "text-xs"}`}>
                {s.displayName}
              </p>
              {s.proposalsReturnPct !== null ? (
                <PnlText pct={s.proposalsReturnPct} className="text-xs" />
              ) : (
                <span className="figures text-xs text-muted">—</span>
              )}
              <div
                className="flex w-full items-start justify-center rounded-t-xl border-[3px] border-b-0 border-line bg-bg pt-1.5 text-xl font-black"
                style={{ height: blockHeight[place], color: placeColor[place] }}
              >
                {place}
              </div>
            </div>
          ))}
        </div>
        {rest.length > 0 && (
          <div className="relative z-10 mt-4 grid gap-2 border-t-[2.5px] border-line pt-4">
            {rest.map((s, i) => (
              <div
                key={s.userId}
                className="flex items-center gap-3 rounded-xl border-[2.5px] border-line px-3 py-2 text-sm"
              >
                <span className="figures w-5 text-muted">{i + 4}</span>
                <Avatar userId={s.userId} name={s.displayName} size={28} />
                <span className="flex-1 font-bold">{s.displayName}</span>
                {s.proposalsReturnPct !== null ? (
                  <PnlText pct={s.proposalsReturnPct} className="text-xs" />
                ) : (
                  <span className="figures text-xs text-muted">—</span>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Tabla completa */}
      <Card className="overflow-x-auto !p-0">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b-[2.5px] border-line text-left text-[10px] font-extrabold uppercase tracking-wide text-muted">
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Jugador</th>
              <th className="px-4 py-3 text-right">Sus propuestas</th>
              <th className="px-4 py-3 text-right">Puntería de voto</th>
              <th className="px-4 py-3 text-right">Puntuación</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((s, i) => (
              <tr key={s.userId} className="border-b-2 border-line/20 last:border-0">
                <td className="figures px-4 py-3">{i + 1}</td>
                <td className="px-4 py-3 font-extrabold">{s.displayName}</td>
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
                <td className="figures px-4 py-3 text-right font-extrabold">
                  {s.score.toFixed(1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Estadísticas de la temporada */}
      <div>
        <h2 className="mb-3 text-lg font-black">Estadísticas de la temporada</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <p className="text-xs font-bold uppercase tracking-wide text-muted">
              Mejor inversión
            </p>
            {stats.bestTrade ? (
              <>
                <p className="figures mt-1 text-xl font-extrabold">
                  {stats.bestTrade.ticker}
                </p>
                <p className="text-sm font-semibold">
                  <PnlText pct={stats.bestTrade.returnPct} /> ·{" "}
                  <span className="text-muted">{nameOf(stats.bestTrade.proposedBy)}</span>
                </p>
              </>
            ) : (
              <p className="mt-1 text-muted">—</p>
            )}
          </Card>
          <Card>
            <p className="text-xs font-bold uppercase tracking-wide text-muted">
              Peor inversión
            </p>
            {stats.worstTrade ? (
              <>
                <p className="figures mt-1 text-xl font-extrabold">
                  {stats.worstTrade.ticker}
                </p>
                <p className="text-sm font-semibold">
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
            <p className="text-xs font-bold uppercase tracking-wide text-muted">
              Fondo vs S&P 500
            </p>
            <p className="mt-1 text-xl font-extrabold">
              <PnlText pct={summary.totalReturnPct} />
            </p>
            <p className="text-sm font-semibold text-muted">
              S&P 500 en el periodo:{" "}
              {stats.benchmarkReturnPct === null ? "—" : fmtPct(stats.benchmarkReturnPct)}
            </p>
          </Card>
        </div>
      </div>

      {/* Historial de temporadas */}
      {seasons.length > 1 && (
        <div>
          <h2 className="mb-3 text-lg font-black">Historial de temporadas</h2>
          <div className="grid gap-3">
            {seasons.map((s) => (
              <Card key={s.id} className="flex flex-wrap items-center justify-between gap-2 !p-4">
                <span className="font-extrabold">{s.name}</span>
                <span className="text-sm font-semibold text-muted">
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
