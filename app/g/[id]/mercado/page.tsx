import { getGroupContext } from "@/lib/loaders";
import { getQuotes, POPULAR_TICKERS, hasRealPrices } from "@/lib/prices";
import { PageTitle } from "@/components/ui";
import { MarketList } from "@/components/MarketList";

export default async function MarketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getGroupContext(id);
  const { season } = ctx;

  const quotesMap = await getQuotes(POPULAR_TICKERS);
  const quotes = POPULAR_TICKERS.map((t) => {
    const q = quotesMap.get(t)!;
    return {
      ticker: t,
      name: q.name,
      price: q.price,
      changePct: q.changePct,
    };
  });

  const canPropose = season?.status === "active";

  return (
    <div>
      <PageTitle
        title="Mercado"
        subtitle={
          hasRealPrices()
            ? "Precios reales con ~15 min de retraso. Explora empresas y propón compras al grupo."
            : "Precios simulados (conecta una API key para datos reales). Explora empresas y propón compras al grupo."
        }
      />
      <MarketList quotes={quotes} groupId={id} canPropose={canPropose} />
    </div>
  );
}
