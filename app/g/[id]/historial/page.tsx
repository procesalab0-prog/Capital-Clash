import { getGroupContext } from "@/lib/loaders";
import { fmtDateTime, fmtMoney, fmtShares } from "@/lib/format";
import { Badge, Card, EmptyState, PageTitle } from "@/components/ui";

export default async function HistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getGroupContext(id);
  const { transactions, season, members } = ctx;

  const nameOf = (userId: string | null) =>
    members.find((m) => m.userId === userId)?.profile.displayName ?? "Cierre de temporada";

  if (!season) {
    return <EmptyState title="Sin temporada" hint="El historial vive dentro de cada temporada." />;
  }

  return (
    <div>
      <PageTitle
        title="Historial de operaciones"
        subtitle={`${transactions.length} operaciones en ${season.name}. Todo queda registrado: esa es la regla.`}
      />
      {transactions.length === 0 ? (
        <EmptyState
          title="Aún no hay operaciones"
          hint="Cuando se apruebe y ejecute la primera propuesta, aparecerá aquí."
        />
      ) : (
        <Card className="overflow-x-auto p-0 sm:p-0">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Operación</th>
                <th className="px-4 py-3 font-medium">Acción</th>
                <th className="px-4 py-3 text-right font-medium">Títulos</th>
                <th className="px-4 py-3 text-right font-medium">Precio</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Propuso</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id} className="border-b border-line last:border-0">
                  <td className="figures px-4 py-3 text-xs text-ink2">
                    {fmtDateTime(t.executedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={t.type === "buy" ? "accent" : "neutral"}>
                      {t.type === "buy" ? "Compra" : "Venta"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <span className="figures font-semibold">{t.ticker}</span>
                    <span className="block text-xs text-muted">{t.companyName}</span>
                  </td>
                  <td className="figures px-4 py-3 text-right">{fmtShares(t.shares)}</td>
                  <td className="figures px-4 py-3 text-right">{fmtMoney(t.price)}</td>
                  <td className="figures px-4 py-3 text-right">{fmtMoney(t.total)}</td>
                  <td className="px-4 py-3 text-ink2">{nameOf(t.proposedBy)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
