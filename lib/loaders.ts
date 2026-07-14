import { notFound, redirect } from "next/navigation";
import { getProvider, isDemoMode } from "./data/provider";
import type { DataProvider, ProposalWithVotes } from "./data/provider";
import { getSessionUser } from "./session";
import { getQuotes, demoPriceAt, getMoneyRate, BENCHMARK_TICKER } from "./prices";
import {
  computePositions,
  computeSummary,
  computeFundSeries,
} from "./portfolio";
import { ensureDailySnapshot, sweepExpiredProposals } from "./game";
import { todayISO } from "./format";
import type {
  FundSnapshot,
  Group,
  GroupMember,
  MemberRole,
  PortfolioSummary,
  Position,
  Profile,
  Quote,
  Season,
  SeasonParticipant,
  Transaction,
} from "./types";

export interface GroupContext {
  provider: DataProvider;
  user: Profile;
  group: Group;
  members: GroupMember[];
  role: MemberRole;
  seasons: Season[];
  /** Temporada activa; si no hay, la más reciente (p. ej. recién cerrada). */
  season: Season | null;
  participants: SeasonParticipant[];
  initialCapital: number;
  transactions: Transaction[];
  proposals: ProposalWithVotes[];
  quotes: Map<string, Quote>;
  summary: PortfolioSummary | null;
  positions: Position[];
}

export async function requireUser(): Promise<Profile> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function getGroupContext(groupId: string): Promise<GroupContext> {
  const user = await requireUser();
  const provider = await getProvider();
  const group = await provider.getGroup(groupId);
  if (!group) notFound();
  const members = await provider.getMembers(groupId);
  const me = members.find((m) => m.userId === user.id);
  if (!me) redirect("/grupos");

  const seasons = await provider.getSeasons(groupId);
  const season =
    seasons.find((s) => s.status === "active") ?? seasons[0] ?? null;

  let participants: SeasonParticipant[] = [];
  let transactions: Transaction[] = [];
  let proposals: ProposalWithVotes[] = [];
  let quotes = new Map<string, Quote>();
  let summary: PortfolioSummary | null = null;
  let positions: Position[] = [];
  let initialCapital = 0;

  if (season) {
    participants = await provider.getParticipants(season.id);
    initialCapital = participants.reduce((s, p) => s + p.contribution, 0);
    transactions = await provider.getTransactions(season.id);
    proposals = await sweepExpiredProposals(
      provider,
      await provider.getProposals(season.id),
    );
    const tickers = [
      ...transactions.map((t) => t.ticker),
      ...proposals.map((p) => p.ticker),
      BENCHMARK_TICKER,
    ];
    quotes = await getQuotes(tickers);
    summary = computeSummary(transactions, quotes, initialCapital);
    positions = computePositions(transactions, quotes);
  }

  return {
    provider,
    user,
    group,
    members,
    role: me.role,
    seasons,
    season,
    participants,
    initialCapital,
    transactions,
    proposals,
    quotes,
    summary,
    positions,
  };
}

/**
 * Serie histórica del fondo para la gráfica.
 * - Modo demo: se reconstruye con la función de precios demo (determinista).
 * - Modo Supabase: snapshots almacenados + snapshot de hoy.
 */
export async function getFundSeries(ctx: GroupContext): Promise<FundSnapshot[]> {
  if (!ctx.season || !ctx.summary) return [];
  if (isDemoMode()) {
    const last =
      ctx.season.status === "closed" && ctx.season.closedAt
        ? ctx.season.closedAt.slice(0, 10)
        : todayISO();
    const rate = await getMoneyRate();
    const series = computeFundSeries(
      ctx.season,
      ctx.transactions,
      ctx.initialCapital,
      (ticker, dateISO) => demoPriceAt(ticker, dateISO) * rate,
      last,
    );
    // El punto de hoy usa las cotizaciones vivas para cuadrar con las tarjetas.
    if (series.length > 0 && ctx.season.status === "active") {
      series[series.length - 1].fundValue = ctx.summary.fundValue;
    }
    return series;
  }
  await ensureDailySnapshot(
    ctx.provider,
    ctx.season,
    ctx.transactions,
    ctx.quotes,
    ctx.initialCapital,
  );
  return ctx.provider.getSnapshots(ctx.season.id);
}
