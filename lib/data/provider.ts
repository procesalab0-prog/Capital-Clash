import type {
  CustomTicker,
  FundSnapshot,
  Group,
  GroupMember,
  GroupMode,
  MemberRole,
  Profile,
  Proposal,
  ProposalStatus,
  Season,
  SeasonParticipant,
  Transaction,
  Vote,
  VoteValue,
} from "../types";

export interface GroupWithMeta extends Group {
  role: MemberRole;
  memberCount: number;
}

export interface ProposalWithVotes extends Proposal {
  votes: Vote[];
  proposerName: string;
}

export interface NewSeasonInput {
  groupId: string;
  name: string;
  startDate: string;
  endDate: string;
  contributionAmount: number;
  participantIds: string[];
}

export interface NewProposalInput {
  seasonId: string;
  proposedBy: string;
  type: "buy" | "sell";
  ticker: string;
  companyName: string;
  amountUsd: number | null;
  shares: number | null;
  thesis: string;
}

export interface NewTransactionInput {
  seasonId: string;
  proposalId: string | null;
  proposedBy: string | null;
  type: "buy" | "sell";
  ticker: string;
  companyName: string;
  shares: number;
  price: number;
  total: number;
}

/**
 * Interfaz de acceso a datos. Tiene dos implementaciones:
 *  - demo (en memoria, sin credenciales) → lib/data/demo.ts
 *  - Supabase (producción) → lib/data/supabase.ts
 * La lógica del juego (votaciones, ejecución, cierre) vive en lib/game.ts
 * y es idéntica para ambas.
 */
export interface DataProvider {
  // Perfiles
  getProfile(userId: string): Promise<Profile | null>;

  // Grupos
  getGroupsForUser(userId: string): Promise<GroupWithMeta[]>;
  getGroup(groupId: string): Promise<Group | null>;
  getMembers(groupId: string): Promise<GroupMember[]>;
  createGroup(name: string, mode: GroupMode, userId: string): Promise<Group>;
  /** Devuelve el grupo si el código existe (y agrega al usuario como miembro). */
  joinGroup(inviteCode: string, userId: string): Promise<Group | null>;
  updateGroup(
    groupId: string,
    fields: { name?: string; mode?: GroupMode },
  ): Promise<void>;
  deleteGroup(groupId: string): Promise<void>;

  // Temporadas
  getSeasons(groupId: string): Promise<Season[]>;
  getSeason(seasonId: string): Promise<Season | null>;
  createSeason(input: NewSeasonInput): Promise<Season>;
  setSeasonStatus(
    seasonId: string,
    status: Season["status"],
    finalValue?: number,
  ): Promise<void>;
  getParticipants(seasonId: string): Promise<SeasonParticipant[]>;

  // Propuestas y votos
  getProposals(seasonId: string): Promise<ProposalWithVotes[]>;
  getProposal(proposalId: string): Promise<ProposalWithVotes | null>;
  createProposal(input: NewProposalInput): Promise<Proposal>;
  updateProposal(
    proposalId: string,
    fields: { amountUsd?: number | null; shares?: number | null; thesis?: string },
  ): Promise<void>;
  deleteProposal(proposalId: string): Promise<void>;
  clearVotes(proposalId: string): Promise<void>;
  castVote(proposalId: string, userId: string, value: VoteValue): Promise<void>;
  setProposalStatus(proposalId: string, status: ProposalStatus): Promise<void>;

  // Transacciones
  getTransactions(seasonId: string): Promise<Transaction[]>;
  addTransaction(input: NewTransactionInput): Promise<Transaction>;

  // Snapshots del fondo (gráfica / Índice Capital Clash)
  getSnapshots(seasonId: string): Promise<FundSnapshot[]>;
  upsertSnapshot(seasonId: string, snapshot: FundSnapshot): Promise<void>;

  // Acciones personalizadas (empresas que no aparecen en el mercado)
  getCustomTickers(groupId: string): Promise<CustomTicker[]>;
  createCustomTicker(input: {
    groupId: string;
    ticker: string;
    companyName: string;
    priceUsd: number;
    createdBy: string;
  }): Promise<CustomTicker>;
}

export function isDemoMode(): boolean {
  return !process.env.NEXT_PUBLIC_SUPABASE_URL;
}

export async function getProvider(): Promise<DataProvider> {
  if (isDemoMode()) {
    const { demoProvider } = await import("./demo");
    return demoProvider;
  }
  const { createSupabaseProvider } = await import("./supabase");
  return createSupabaseProvider();
}
