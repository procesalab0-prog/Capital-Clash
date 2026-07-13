import Link from "next/link";
import { getFundSeries, getGroupContext } from "@/lib/loaders";
import { voteState } from "@/lib/game";
import { daysBetween, fmtMoney, fmtPct, todayISO } from "@/lib/format";
import {
  btnPrimary,
  Card,
  EmptyState,
  PnlText,
  SubCard,
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
  const daysLeft = Math.max(0, daysBetween(todayISO(), season.endDate));

  return (
    <div className="grid gap-5">
      {/* Hero: valor del fondo */}
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted">
              Valor del fondo
            </p>
            <p className="figures mt-1 text-4xl font-extrabold tracking-tight sm:text-5xl">
              {fmtMoney(summary.fundValue)}
            </p>
            <p className="mt-1.5 text-sm">
              <PnlText value={summary.totalReturn} pct={summary.totalReturnPct} />{" "}
              <span className="text-xs font-semibold text-muted">
                esta temporada
                {season.status === "active" && ` · quedan ${daysLeft} días`}
              </span>
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { label: "Capital", value: fmtMoney(summary.initialCapital) },
              { label: "Efectivo", value: fmtMoney(summary.cash) },
              { label: "Invertido", value: fmtMoney(summary.positionsValue) },
            ].map((s) => (
              <SubCard key={s.label} className="min-w-[100px] px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
                  {s.label}
                </p>
                <p className="figures mt-0.5 text-sm">{s.value}</p>
              </SubCard>
            ))}
          </div>
        </div>
      </Card>

      {/* Banner: te toca votar */}
      {pendingMyVote.length > 0 && (
        <Link href={`/g/${id}/propuestas`}>
          <div className="hard-shadow flex items-center justify-between gap-3 rounded-2xl border-[3px] border-line bg-accent px-5 py-4 text-white transition hover:-translate-y-0.5">
            <div>
              <p className="text-[15px] font-black">¡Te toca votar!</p>
              <p className="text-xs font-bold opacity-90">
                {pendingMyVote.length === 1
                  ? "1 propuesta espera tu voto"
                  : `${pendingMyVote.length} propuestas esperan tu voto`}
              </p>
            </div>
            <span aria-hidden className="text-2xl font-black">
              ›
            </span>
          </div>
        </Link>
      )}

      {/* Índice Capital Clash */}
      <Card>
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <h2 className="font-extrabold">Índice Capital Clash</h2>
          <span className="text-xs font-bold text-muted">
            {season.name} · {participants.length}{" "}
            {participants.length === 1 ? "jugador" : "jugadores"}
          </span>
        </div>
        {series.length >= 2 ? (
          <FundChart data={series} />
        ) : (
          <p className="py-8 text-center text-sm font-semibold text-muted">
            La gráfica aparecerá conforme avance la temporada.
          </p>
        )}
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-extrabold">Propuestas pendientes</h2>
            <Link
              href={`/g/${id}/propuestas`}
              className="text-sm font-bold text-accent hover:underline"
            >
              Ver todas →
            </Link>
          </div>
          {pendingMyVote.length === 0 ? (
            <p className="py-4 text-sm font-semibold text-muted">
              Estás al día: no hay propuestas esperando tu voto. 🎉
            </p>
          ) : (
            <ul className="grid gap-2">
              {pendingMyVote.map((p) => {
                const st = voteState(p, participants.length);
                return (
                  <li key={p.id}>
                    <SubCard className="flex items-center justify-between gap-2 px-3 py-2.5 text-sm">
                      <span>
                        <span className="figures font-extrabold">{p.ticker}</span>{" "}
                        <span className="font-semibold text-ink2">
                          {p.type === "buy" ? "compra" : "venta"} · propone{" "}
                          {p.proposerName}
                        </span>
                      </span>
                      <span className="figures whitespace-nowrap text-xs text-muted">
                        {st.yes}/{st.needed} sí
                      </span>
                    </SubCard>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-extrabold">Posiciones principales</h2>
            <Link
              href={`/g/${id}/portafolio`}
              className="text-sm font-bold text-accent hover:underline"
            >
              Ver portafolio →
            </Link>
          </div>
          {topPositions.length === 0 ? (
            <p className="py-4 text-sm font-semibold text-muted">
              Aún no hay posiciones. Propongan su primera inversión.
            </p>
          ) : (
            <ul className="grid gap-2">
              {topPositions.map((p) => (
                <li key={p.ticker}>
                  <SubCard className="flex items-center justify-between gap-2 px-3 py-2.5 text-sm">
                    <span>
                      <span className="figures font-extrabold">{p.ticker}</span>{" "}
                      <span className="hidden font-semibold text-ink2 sm:inline">
                        {p.companyName}
                      </span>
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="figures">{fmtMoney(p.currentValue)}</span>
                      <PnlText pct={p.pnlPct} className="text-xs" />
                    </span>
                  </SubCard>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {season.status === "closed" && (
        <Card className="!border-accent">
          <p className="text-sm font-semibold">
            🏁 Esta temporada terminó con un valor final de{" "}
            <span className="figures">
              {fmtMoney(season.finalValue ?? summary.fundValue)}
            </span>{" "}
            ({fmtPct(summary.totalReturnPct)}).{" "}
            <Link
              href={`/g/${id}/ranking`}
              className="font-bold text-accent hover:underline"
            >
              Ver el podio final →
            </Link>
          </p>
        </Card>
      )}
    </div>
  );
}
