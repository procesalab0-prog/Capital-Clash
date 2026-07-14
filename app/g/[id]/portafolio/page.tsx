import { getGroupContext } from "@/lib/loaders";
import { fmtMoney, fmtShares } from "@/lib/format";
import { Card, DualPrice, EmptyState, PageTitle, PnlText } from "@/components/ui";

export default async function PortfolioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getGroupContext(id);
  const { positions, summary, season } = ctx;

  if (!season || !summary) {
    return <EmptyState title="Sin temporada activa" hint="Crea una temporada para empezar a invertir." />;
  }

  return (
    <div>
      <PageTitle
        title="Portafolio"
        subtitle={`${positions.length} ${positions.length === 1 ? "posición abierta" : "posiciones abiertas"} · efectivo ${fmtMoney(summary.cash)} · P/L realizado ${fmtMoney(summary.realizedPnl)}`}
      />
      {positions.length === 0 ? (
        <EmptyState
          mascot="laptop"
          title="No hay posiciones abiertas"
          hint="Cuando el grupo apruebe una compra, aparecerá aquí con su ganancia o pérdida en vivo."
        />
      ) : (
        <Card className="overflow-x-auto !p-0">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b-[2.5px] border-line text-left text-[10px] font-extrabold uppercase tracking-wide text-muted">
                <th className="px-4 py-3">Acción</th>
                <th className="px-4 py-3 text-right">Títulos</th>
                <th className="px-4 py-3 text-right">Costo prom.</th>
                <th className="px-4 py-3 text-right">Precio actual</th>
                <th className="px-4 py-3 text-right">Valor</th>
                <th className="px-4 py-3 text-right">G / P</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((p) => (
                <tr key={p.ticker} className="border-b-2 border-line/20 last:border-0">
                  <td className="px-4 py-3">
                    <span className="figures font-extrabold">{p.ticker}</span>
                    <span className="block text-xs font-semibold text-muted">
                      {p.companyName}
                    </span>
                  </td>
                  <td className="figures px-4 py-3 text-right">{fmtShares(p.shares)}</td>
                  <td className="figures px-4 py-3 text-right">{fmtMoney(p.avgCost)}</td>
                  <td className="px-4 py-3 text-right">
                    <DualPrice usd={p.currentPriceUsd} size="sm" />
                  </td>
                  <td className="figures px-4 py-3 text-right">{fmtMoney(p.currentValue)}</td>
                  <td className="px-4 py-3 text-right">
                    <PnlText value={p.pnl} pct={p.pnlPct} />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-[2.5px] border-line text-sm font-extrabold">
                <td className="px-4 py-3">Total posiciones</td>
                <td colSpan={3} />
                <td className="figures px-4 py-3 text-right">
                  {fmtMoney(summary.positionsValue)}
                </td>
                <td className="px-4 py-3 text-right">
                  <PnlText value={positions.reduce((s, p) => s + p.pnl, 0)} />
                </td>
              </tr>
            </tfoot>
          </table>
        </Card>
      )}
    </div>
  );
}
