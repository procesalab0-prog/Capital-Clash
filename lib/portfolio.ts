import { USD_MXN_RATE } from "./format";
import type {
  FundSnapshot,
  ParticipantStanding,
  PortfolioSummary,
  Position,
  Quote,
  Season,
  SeasonParticipant,
  SeasonStats,
  Transaction,
  Vote,
} from "./types";

/**
 * Cálculos derivados del fondo. Las posiciones NO se almacenan:
 * siempre se derivan del historial de transacciones, que es la
 * única fuente de verdad.
 */

interface Lot {
  shares: number;
  avgCost: number;
  companyName: string;
  realizedPnl: number;
}

function buildLots(transactions: Transaction[]): Map<string, Lot> {
  const lots = new Map<string, Lot>();
  const sorted = [...transactions].sort(
    (a, b) => new Date(a.executedAt).getTime() - new Date(b.executedAt).getTime(),
  );
  for (const tx of sorted) {
    const lot = lots.get(tx.ticker) ?? {
      shares: 0,
      avgCost: 0,
      companyName: tx.companyName,
      realizedPnl: 0,
    };
    if (tx.type === "buy") {
      const totalCost = lot.shares * lot.avgCost + tx.total;
      lot.shares += tx.shares;
      lot.avgCost = lot.shares > 0 ? totalCost / lot.shares : 0;
    } else {
      lot.realizedPnl += (tx.price - lot.avgCost) * tx.shares;
      lot.shares -= tx.shares;
      if (lot.shares <= 1e-9) lot.shares = 0;
    }
    lot.companyName = tx.companyName || lot.companyName;
    lots.set(tx.ticker, lot);
  }
  return lots;
}

export function computePositions(
  transactions: Transaction[],
  quotes: Map<string, Quote>,
): Position[] {
  const lots = buildLots(transactions);
  const positions: Position[] = [];
  for (const [ticker, lot] of lots) {
    if (lot.shares <= 0) continue;
    const quote = quotes.get(ticker);
    const currentPrice = quote?.price ?? lot.avgCost;
    const invested = lot.shares * lot.avgCost;
    const currentValue = lot.shares * currentPrice;
    positions.push({
      ticker,
      companyName: lot.companyName,
      shares: lot.shares,
      avgCost: lot.avgCost,
      invested,
      currentPrice,
      currentPriceUsd: quote?.priceUsd ?? currentPrice / USD_MXN_RATE,
      currentValue,
      pnl: currentValue - invested,
      pnlPct: invested > 0 ? ((currentValue - invested) / invested) * 100 : 0,
    });
  }
  return positions.sort((a, b) => b.currentValue - a.currentValue);
}

export function computeSummary(
  transactions: Transaction[],
  quotes: Map<string, Quote>,
  initialCapital: number,
): PortfolioSummary {
  let cash = initialCapital;
  for (const tx of transactions) {
    cash += tx.type === "buy" ? -tx.total : tx.total;
  }
  const positions = computePositions(transactions, quotes);
  const positionsValue = positions.reduce((s, p) => s + p.currentValue, 0);
  const fundValue = cash + positionsValue;
  let realizedPnl = 0;
  for (const lot of buildLots(transactions).values()) realizedPnl += lot.realizedPnl;
  return {
    cash,
    positionsValue,
    fundValue,
    initialCapital,
    totalReturn: fundValue - initialCapital,
    totalReturnPct:
      initialCapital > 0 ? ((fundValue - initialCapital) / initialCapital) * 100 : 0,
    realizedPnl,
  };
}

/**
 * Retorno de cada compra ejecutada, valuada a precio actual (posición viva)
 * — base de "mejor/peor inversión" y del ranking individual.
 */
interface TradeReturn {
  ticker: string;
  proposedBy: string | null;
  invested: number;
  returnPct: number;
}

export function computeTradeReturns(
  transactions: Transaction[],
  quotes: Map<string, Quote>,
): TradeReturn[] {
  return transactions
    .filter((tx) => tx.type === "buy")
    .map((tx) => {
      const currentPrice = quotes.get(tx.ticker)?.price ?? tx.price;
      return {
        ticker: tx.ticker,
        proposedBy: tx.proposedBy,
        invested: tx.total,
        returnPct: tx.price > 0 ? ((currentPrice - tx.price) / tx.price) * 100 : 0,
      };
    });
}

export function computeStandings(
  participants: SeasonParticipant[],
  transactions: Transaction[],
  votes: Vote[],
  quotes: Map<string, Quote>,
  summary: PortfolioSummary,
): ParticipantStanding[] {
  const tradeReturns = computeTradeReturns(transactions, quotes);
  const totalContribution = participants.reduce((s, p) => s + p.contribution, 0);

  // Precisión de voto: votar "sí" a compras que van ganando (o "no" a las que
  // van perdiendo) cuenta como acierto.
  const buyOutcome = new Map<string, boolean>(); // proposalId -> ganadora
  for (const tx of transactions) {
    if (tx.type !== "buy" || !tx.proposalId) continue;
    const currentPrice = quotes.get(tx.ticker)?.price ?? tx.price;
    buyOutcome.set(tx.proposalId, currentPrice >= tx.price);
  }

  const standings = participants.map((p) => {
    const mine = tradeReturns.filter((t) => t.proposedBy === p.userId);
    const invested = mine.reduce((s, t) => s + t.invested, 0);
    const weightedReturn =
      invested > 0
        ? mine.reduce((s, t) => s + t.returnPct * t.invested, 0) / invested
        : null;

    const myVotes = votes.filter(
      (v) => v.userId === p.userId && buyOutcome.has(v.proposalId),
    );
    const correct = myVotes.filter(
      (v) => (v.value === "yes") === buyOutcome.get(v.proposalId),
    ).length;
    const voteAccuracy =
      myVotes.length > 0 ? (correct / myVotes.length) * 100 : null;

    const sharePct =
      totalContribution > 0 ? (p.contribution / totalContribution) * 100 : 0;

    // Puntuación: retorno de sus propuestas + bono acotado por puntería de
    // voto (máx. ±2.5 pts), para que el rendimiento siempre pese más.
    const score =
      (weightedReturn ?? 0) + ((voteAccuracy ?? 50) - 50) * 0.05;

    return {
      userId: p.userId,
      displayName: p.profile.displayName,
      contribution: p.contribution,
      sharePct,
      currentShareValue: (sharePct / 100) * summary.fundValue,
      proposalsExecuted: mine.length,
      proposalsReturnPct: weightedReturn,
      voteAccuracyPct: voteAccuracy,
      score,
    };
  });

  return standings.sort((a, b) => b.score - a.score);
}

export function computeSeasonStats(
  transactions: Transaction[],
  quotes: Map<string, Quote>,
  snapshots: FundSnapshot[],
): SeasonStats {
  const tradeReturns = computeTradeReturns(transactions, quotes);
  const best =
    tradeReturns.length > 0
      ? tradeReturns.reduce((a, b) => (b.returnPct > a.returnPct ? b : a))
      : null;
  const worst =
    tradeReturns.length > 0
      ? tradeReturns.reduce((a, b) => (b.returnPct < a.returnPct ? b : a))
      : null;

  let benchmarkReturnPct: number | null = null;
  const withBench = snapshots.filter((s) => s.benchmarkValue !== null);
  if (withBench.length >= 2) {
    const first = withBench[0].benchmarkValue!;
    const last = withBench[withBench.length - 1].benchmarkValue!;
    if (first > 0) benchmarkReturnPct = ((last - first) / first) * 100;
  }

  return {
    bestTrade: best
      ? { ticker: best.ticker, returnPct: best.returnPct, proposedBy: best.proposedBy ?? "" }
      : null,
    worstTrade: worst
      ? { ticker: worst.ticker, returnPct: worst.returnPct, proposedBy: worst.proposedBy ?? "" }
      : null,
    avgTradeReturnPct:
      tradeReturns.length > 0
        ? tradeReturns.reduce((s, t) => s + t.returnPct, 0) / tradeReturns.length
        : null,
    totalTrades: transactions.length,
    benchmarkReturnPct,
  };
}

/**
 * Serie histórica del valor del fondo para la gráfica, calculada a partir
 * de las transacciones y una función de precio histórico (modo demo) o
 * usada directamente desde snapshots almacenados (modo Supabase).
 */
export function computeFundSeries(
  season: Season,
  transactions: Transaction[],
  initialCapital: number,
  priceAt: (ticker: string, dateISO: string) => number,
  lastDateISO: string,
): FundSnapshot[] {
  const series: FundSnapshot[] = [];
  const start = new Date(season.startDate + "T12:00:00Z");
  const end = new Date(lastDateISO + "T12:00:00Z");
  const benchStart = priceAt("^GSPC", season.startDate);

  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const dateISO = d.toISOString().slice(0, 10);
    const dayEnd = dateISO + "T23:59:59Z";
    let cash = initialCapital;
    const holdings = new Map<string, number>();
    for (const tx of transactions) {
      if (tx.executedAt > dayEnd) continue;
      cash += tx.type === "buy" ? -tx.total : tx.total;
      holdings.set(
        tx.ticker,
        (holdings.get(tx.ticker) ?? 0) + (tx.type === "buy" ? tx.shares : -tx.shares),
      );
    }
    let positionsValue = 0;
    for (const [ticker, shares] of holdings) {
      if (shares > 1e-9) positionsValue += shares * priceAt(ticker, dateISO);
    }
    // Benchmark normalizado al capital inicial para comparar en la misma escala.
    const bench =
      benchStart > 0
        ? (priceAt("^GSPC", dateISO) / benchStart) * initialCapital
        : null;
    series.push({
      date: dateISO,
      fundValue: Math.round((cash + positionsValue) * 100) / 100,
      benchmarkValue: bench !== null ? Math.round(bench * 100) / 100 : null,
    });
  }
  return series;
}
