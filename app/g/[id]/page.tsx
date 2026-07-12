import Link from "next/link";
import { getFundSeries, getGroupContext } from "@/lib/loaders";
import { voteState } from "@/lib/game";
import { fmtMoney, fmtPct } from "@/lib/format";
import {
  btnPrimary,
  Card,
  EmptyState,
  PnlText,
  StatCard,
} from "@/components/ui";
import { FundChart } from "@/components/FundChart";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getGroupContext(id);
  const { season, summary, positions, proposals, participants, user, role } = ctx;

  if (!season || !summary) {
    return (
      <EmptyState
        title="Este grupo aún no tiene temporada"
        hint="El administrador define la aportación y la duración para arrancar el juego."
        action={
          role === "admin" ? (
            <Link href={`/g/${id}/temporada`} className={btnPrimary}>
              Crear la primera temporada
            </Link>
          ) : undefined
        }
      />
    );
  }

  const series = await getFundSeries(ctx);
  const pendingMyVote = proposals.filter(
    (p) =>
      p.status === "pending" && !p.votes.some((v) => v.userId === user.id),
  );
  const topPositions = positions.slice(0, 4);

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Valor del fondo"
          value={fmtMoney(summary.fundValue)}
          delta={summary.totalReturn}
          deltaPct={summary.totalReturnPct}
          hero
        />
        <StatCard
          label="Capital inicial"
          value={fmtMoney(summary.initialCapital)}
        />
        <StatCard label="Efectivo disponible" value={fmtMoney(summary.cash)} />
        <StatCard
          label="Invertido en posiciones"
          value={fmtMoney(summary.positionsValue)}
        />
      </div>

      <Card>
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <h2 className="font-semibold">Índice Capital Clash</h2>
          <span className="text-xs text-muted">
            {season.name} · {participants.length}{" "}
            {participants.length === 1 ? "participante" : "participantes"}
          </span>
        </div>
        {series.length >= 2 ? (
          <FundChart data={series} />
        ) : (
          <p className="py-8 text-center text-sm text-muted">
            La gráfica aparecerá conforme avance la temporada.
          </p>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-semibold">Te toca votar</h2>
            <Link
              href={`/g/${id}/propuestas`}
              className="text-sm text-accent hover:underline"
            >
              Ver propuestas →
            </Link>
          </div>
          {pendingMyVote.length === 0 ? (
            <p className="py-4 text-sm text-muted">
              Estás al día: no hay propuestas esperando tu voto.
            </p>
          ) : (
            <ul className="grid gap-2">
              {pendingMyVote.map((p) => {
                const st = voteState(p, participants.length);
                return (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-2 text-sm"
                  >
                    <span>
                      <span className="figures font-semibold">{p.ticker}</span>{" "}
                      <span className="text-ink2">
                        {p.type === "buy" ? "compra" : "venta"} · propone{" "}
                        {p.proposerName}
                      </span>
                    </span>
                    <span className="figures whitespace-nowrap text-xs text-muted">
                      {st.yes}/{st.needed} sí
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-semibold">Posiciones principales</h2>
            <Link
              href={`/g/${id}/portafolio`}
              className="text-sm text-accent hover:underline"
            >
              Ver portafolio →
            </Link>
          </div>
          {topPositions.length === 0 ? (
            <p className="py-4 text-sm text-muted">
              Aún no hay posiciones. Propongan su primera inversión.
            </p>
          ) : (
            <ul className="grid gap-2">
              {topPositions.map((p) => (
                <li
                  key={p.ticker}
                  className="flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-2 text-sm"
                >
                  <span>
                    <span className="figures font-semibold">{p.ticker}</span>{" "}
                    <span className="hidden text-ink2 sm:inline">
                      {p.companyName}
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="figures">{fmtMoney(p.currentValue)}</span>
                    <PnlText pct={p.pnlPct} className="text-xs" />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {season.status === "closed" && (
        <Card className="border-accent/40">
          <p className="text-sm">
            🏁 Esta temporada terminó con un valor final de{" "}
            <span className="figures font-semibold">
              {fmtMoney(season.finalValue ?? summary.fundValue)}
            </span>{" "}
            ({fmtPct(summary.totalReturnPct)}).{" "}
            <Link
              href={`/g/${id}/ranking`}
              className="text-accent hover:underline"
            >
              Ver el ranking final →
            </Link>
          </p>
        </Card>
      )}
    </div>
  );
}
