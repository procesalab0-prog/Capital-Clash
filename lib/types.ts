// Tipos del dominio de Capital Clash

export type GroupMode = "real" | "simulado";
export type MemberRole = "admin" | "member";
export type SeasonStatus = "draft" | "active" | "closed";
export type ProposalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "executed"
  | "expired";
export type TradeType = "buy" | "sell";
export type VoteValue = "yes" | "no";

export interface Profile {
  id: string;
  displayName: string;
}

export interface Group {
  id: string;
  name: string;
  mode: GroupMode;
  inviteCode: string;
  createdBy: string;
  createdAt: string; // ISO
}

export interface GroupMember {
  groupId: string;
  userId: string;
  role: MemberRole;
  profile: Profile;
}

export interface Season {
  id: string;
  groupId: string;
  name: string;
  startDate: string; // ISO date
  endDate: string; // ISO date
  contributionAmount: number; // aportación por participante (USD)
  status: SeasonStatus;
  finalValue: number | null; // valor del fondo al cierre
  closedAt: string | null;
}

export interface SeasonParticipant {
  seasonId: string;
  userId: string;
  contribution: number;
  profile: Profile;
}

export interface Proposal {
  id: string;
  seasonId: string;
  proposedBy: string;
  type: TradeType;
  ticker: string;
  companyName: string;
  /** Para compras: monto en USD a invertir. Para ventas: null (se usa shares). */
  amountUsd: number | null;
  /** Para ventas: número de acciones a vender. Para compras: null. */
  shares: number | null;
  thesis: string;
  status: ProposalStatus;
  createdAt: string;
  expiresAt: string;
}

export interface Vote {
  proposalId: string;
  userId: string;
  value: VoteValue;
  createdAt: string;
}

export interface Transaction {
  id: string;
  seasonId: string;
  proposalId: string | null;
  proposedBy: string | null;
  type: TradeType;
  ticker: string;
  companyName: string;
  shares: number;
  price: number;
  total: number;
  executedAt: string;
}

export interface FundSnapshot {
  date: string; // ISO date (YYYY-MM-DD)
  fundValue: number;
  benchmarkValue: number | null; // S&P 500
}

export interface Quote {
  ticker: string;
  name: string;
  price: number;
  changePct: number | null; // variación del día, si se conoce
}

export interface TickerSearchResult {
  ticker: string;
  name: string;
}

// ---- Valores derivados (calculados, no almacenados) ----

export interface Position {
  ticker: string;
  companyName: string;
  shares: number;
  avgCost: number; // costo promedio por acción
  invested: number; // shares * avgCost
  currentPrice: number;
  currentValue: number;
  pnl: number; // ganancia/pérdida no realizada
  pnlPct: number;
}

export interface PortfolioSummary {
  cash: number;
  positionsValue: number;
  fundValue: number; // cash + posiciones
  initialCapital: number;
  totalReturn: number; // fundValue - initialCapital
  totalReturnPct: number;
  realizedPnl: number; // P/L de ventas ya ejecutadas
}

export interface ParticipantStanding {
  userId: string;
  displayName: string;
  contribution: number;
  sharePct: number; // % de participación en el fondo
  currentShareValue: number; // su parte del fondo hoy
  proposalsExecuted: number; // compras suyas ejecutadas
  proposalsReturnPct: number | null; // retorno ponderado de sus compras
  voteAccuracyPct: number | null; // % de votos "acertados"
  score: number; // puntuación para el ranking
}

export interface SeasonStats {
  bestTrade: { ticker: string; returnPct: number; proposedBy: string } | null;
  worstTrade: { ticker: string; returnPct: number; proposedBy: string } | null;
  avgTradeReturnPct: number | null;
  totalTrades: number;
  benchmarkReturnPct: number | null; // S&P 500 en el mismo periodo
}
