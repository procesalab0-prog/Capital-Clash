import { getGroupContext } from "@/lib/loaders";
import { getQuotes, POPULAR_TICKERS, hasRealPrices } from "@/lib/prices";
import { PageTitle } from "@/components/ui";
import { MarketList } from "@/components/MarketList";
import { CustomTickerForm } from "@/components/CustomTickerForm";

export default async function MarketPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const ctx = await getGroupContext(id);
  const { season, customTickers } = ctx;

  const quotesMap = await getQuotes(POPULAR_TICKERS);
  const quotes = [
    ...POPULAR_TICKERS.map((t) => {
      const q = quotesMap.get(t)!;
      return {
        ticker: t,
        name: q.name,
        priceUsd: q.priceUsd,
        changePct: q.changePct,
      };
    }),
    ...customTickers.map((c) => ({
      ticker: c.ticker,
      name: c.companyName,
      priceUsd: c.priceUsd,
      changePct: null,
      custom: true,
    })),
  ];

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
      {error && (
        <p className="hard-shadow-sm mb-4 rounded-xl border-[3px] border-loss bg-surface px-3 py-2 text-sm font-bold text-loss">
          ⚠ {decodeURIComponent(error)}
        </p>
      )}
      <div className="mb-5">
        <CustomTickerForm groupId={id} />
      </div>
      <MarketList quotes={quotes} groupId={id} canPropose={canPropose} />
    </div>
  );
}
