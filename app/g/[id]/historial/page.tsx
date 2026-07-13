import { getGroupContext } from "@/lib/loaders";
import { fmtDateTime, fmtMoney, fmtShares } from "@/lib/format";
import { Card, EmptyState, PageTitle } from "@/components/ui";

export default async function HistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getGroupContext(id);
  const { transactions, season, members } = ctx;

  const nameOf = (userId: string | null) =>
    members.find((m) => m.userId === userId)?.profile.displayName ??
    "Cierre de temporada";

  if (!season) {
    return <EmptyState title="Sin temporada" hint="El historial vive dentro de cada temporada." />;
  }

  return (
    <div>
      <PageTitle
        title="Historial"
        subtitle={`${transactions.length} operaciones ejecutadas en ${season.name}. Todo queda registrado: esa es la regla.`}
      />
      {transactions.length === 0 ? (
        <EmptyState
          title="Aún no hay operaciones"
          hint="Cuando se apruebe y ejecute la primera propuesta, aparecerá aquí."
        />
      ) : (
        <Card className="overflow-x-auto !p-0">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b-[2.5px] border-line text-left text-[10px] font-extrabold uppercase tracking-wide text-muted">
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Operación</th>
                <th className="px-4 py-3">Acción</th>
                <th className="px-4 py-3 text-right">Títulos</th>
                <th className="px-4 py-3 text-right">Precio</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3">Propuso</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id} className="border-b-2 border-line/20 last:border-0">
                  <td className="figures px-4 py-3 text-xs text-ink2">
                    {fmtDateTime(t.executedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block -rotate-2 rounded-lg px-2 py-1 text-[10px] font-extrabold uppercase ${
                        t.type === "buy" ? "bg-ink text-bg" : "bg-accent text-white"
                      }`}
                    >
                      {t.type === "buy" ? "Compra" : "Venta"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="figures font-extrabold">{t.ticker}</span>
                    <span className="block text-xs font-semibold text-muted">
                      {t.companyName}
                    </span>
                  </td>
                  <td className="figures px-4 py-3 text-right">{fmtShares(t.shares)}</td>
                  <td className="figures px-4 py-3 text-right">{fmtMoney(t.price)}</td>
                  <td className="figures px-4 py-3 text-right">
                    <span className={t.type === "buy" ? "text-loss" : "text-gain"}>
                      {t.type === "buy" ? "−" : "+"}
                      {fmtMoney(t.total)}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-ink2">
                    {nameOf(t.proposedBy)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
