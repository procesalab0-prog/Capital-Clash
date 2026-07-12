import { unstable_cache } from "next/cache";
import type { Quote, TickerSearchResult } from "./types";

/**
 * Precios de acciones.
 *
 * Con FMP_API_KEY configurada se usan cotizaciones reales de
 * Financial Modeling Prep (caché de 15 minutos, solo servidor).
 * Sin key se usan precios demo deterministas que fluctúan día a día,
 * suficientes para probar toda la app sin depender de servicios externos.
 */

export const BENCHMARK_TICKER = "^GSPC"; // S&P 500

const FMP_BASE = "https://financialmodelingprep.com/api/v3";

function fmpKey(): string | null {
  return process.env.FMP_API_KEY || null;
}

export function hasRealPrices(): boolean {
  return fmpKey() !== null;
}

// ---------------------------------------------------------------------------
// Precios demo deterministas
// ---------------------------------------------------------------------------

/** Precios base para el universo demo (aprox. niveles reales de 2026). */
const DEMO_UNIVERSE: Record<string, { name: string; base: number }> = {
  AAPL: { name: "Apple Inc.", base: 255 },
  MSFT: { name: "Microsoft Corporation", base: 510 },
  NVDA: { name: "NVIDIA Corporation", base: 188 },
  AMZN: { name: "Amazon.com Inc.", base: 232 },
  GOOGL: { name: "Alphabet Inc.", base: 201 },
  META: { name: "Meta Platforms Inc.", base: 640 },
  TSLA: { name: "Tesla Inc.", base: 415 },
  NFLX: { name: "Netflix Inc.", base: 1150 },
  AMD: { name: "Advanced Micro Devices", base: 162 },
  DIS: { name: "The Walt Disney Company", base: 112 },
  KO: { name: "The Coca-Cola Company", base: 71 },
  PEP: { name: "PepsiCo Inc.", base: 152 },
  MCD: { name: "McDonald's Corporation", base: 297 },
  NKE: { name: "Nike Inc.", base: 78 },
  SBUX: { name: "Starbucks Corporation", base: 92 },
  V: { name: "Visa Inc.", base: 342 },
  MA: { name: "Mastercard Incorporated", base: 552 },
  JPM: { name: "JPMorgan Chase & Co.", base: 268 },
  BRK_B: { name: "Berkshire Hathaway", base: 486 },
  UBER: { name: "Uber Technologies", base: 88 },
  SHOP: { name: "Shopify Inc.", base: 128 },
  PLTR: { name: "Palantir Technologies", base: 142 },
  COIN: { name: "Coinbase Global", base: 315 },
  VOO: { name: "Vanguard S&P 500 ETF", base: 578 },
  QQQ: { name: "Invesco QQQ Trust", base: 542 },
  "^GSPC": { name: "S&P 500", base: 6290 },
};

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h;
}

function dayIndex(dateISO: string): number {
  return Math.floor(new Date(dateISO + "T12:00:00Z").getTime() / 86_400_000);
}

/**
 * Precio demo determinista para un ticker en una fecha dada:
 * una tendencia suave + ondas por ticker, siempre reproducible.
 */
export function demoPriceAt(ticker: string, dateISO: string): number {
  const entry = DEMO_UNIVERSE[ticker];
  const base = entry ? entry.base : 40 + (Math.abs(hashCode(ticker)) % 400);
  const seed = Math.abs(hashCode(ticker));
  const t = dayIndex(dateISO) - dayIndex("2026-01-01");
  const drift = 0.0006 * ((seed % 7) - 2); // tendencia distinta por ticker
  const wave1 = 0.03 * Math.sin(t / 9 + (seed % 17));
  const wave2 = 0.015 * Math.sin(t / 3.3 + (seed % 5));
  const noise = 0.008 * Math.sin(t * 2.7 + (seed % 23));
  const factor = 1 + drift * t + wave1 + wave2 + noise;
  return Math.round(base * Math.max(0.2, factor) * 100) / 100;
}

function demoQuote(ticker: string, dateISO: string): Quote {
  const prev = demoPriceAt(ticker, prevDayISO(dateISO));
  const price = demoPriceAt(ticker, dateISO);
  const entry = DEMO_UNIVERSE[ticker];
  return {
    ticker,
    name: entry ? entry.name : ticker,
    price,
    changePct: prev > 0 ? ((price - prev) / prev) * 100 : null,
  };
}

function prevDayISO(dateISO: string): string {
  const d = new Date(dateISO + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function demoSearchTickers(query: string): TickerSearchResult[] {
  const q = query.trim().toUpperCase();
  if (!q) return [];
  return Object.entries(DEMO_UNIVERSE)
    .filter(([ticker]) => ticker !== BENCHMARK_TICKER)
    .filter(
      ([ticker, { name }]) =>
        ticker.includes(q) || name.toUpperCase().includes(q),
    )
    .slice(0, 8)
    .map(([ticker, { name }]) => ({ ticker, name }));
}

// ---------------------------------------------------------------------------
// FMP (precios reales)
// ---------------------------------------------------------------------------

interface FmpQuote {
  symbol: string;
  name: string;
  price: number;
  changesPercentage: number;
}

const fetchFmpQuotes = unstable_cache(
  async (tickers: string[]): Promise<Quote[]> => {
    const key = fmpKey();
    if (!key) return [];
    const symbols = tickers.map(encodeURIComponent).join(",");
    const res = await fetch(`${FMP_BASE}/quote/${symbols}?apikey=${key}`);
    if (!res.ok) throw new Error(`FMP quote error: ${res.status}`);
    const data = (await res.json()) as FmpQuote[];
    return data.map((q) => ({
      ticker: q.symbol,
      name: q.name,
      price: q.price,
      changePct: q.changesPercentage ?? null,
    }));
  },
  ["fmp-quotes"],
  { revalidate: 900 }, // 15 minutos
);

const fetchFmpSearch = unstable_cache(
  async (query: string): Promise<TickerSearchResult[]> => {
    const key = fmpKey();
    if (!key) return [];
    const res = await fetch(
      `${FMP_BASE}/search-ticker?query=${encodeURIComponent(query)}&limit=8&exchange=NASDAQ,NYSE,AMEX&apikey=${key}`,
    );
    if (!res.ok) throw new Error(`FMP search error: ${res.status}`);
    const data = (await res.json()) as { symbol: string; name: string }[];
    return data.map((r) => ({ ticker: r.symbol, name: r.name }));
  },
  ["fmp-search"],
  { revalidate: 3600 },
);

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------

/** Cotizaciones actuales (reales con FMP, demo sin key). Devuelve un mapa por ticker. */
export async function getQuotes(
  tickers: string[],
): Promise<Map<string, Quote>> {
  const unique = [...new Set(tickers)];
  const map = new Map<string, Quote>();
  if (unique.length === 0) return map;

  const today = new Date().toISOString().slice(0, 10);
  if (hasRealPrices()) {
    try {
      const quotes = await fetchFmpQuotes(unique.sort());
      for (const q of quotes) map.set(q.ticker, q);
    } catch {
      // Si FMP falla, degradamos a precios demo para no romper la app.
    }
  }
  for (const t of unique) {
    if (!map.has(t)) map.set(t, demoQuote(t, today));
  }
  return map;
}

export async function getQuote(ticker: string): Promise<Quote> {
  const map = await getQuotes([ticker]);
  return map.get(ticker)!;
}

export async function searchTickers(
  query: string,
): Promise<TickerSearchResult[]> {
  if (!query.trim()) return [];
  if (hasRealPrices()) {
    try {
      const results = await fetchFmpSearch(query.trim());
      if (results.length > 0) return results;
    } catch {
      // degradar a demo
    }
  }
  return demoSearchTickers(query);
}
