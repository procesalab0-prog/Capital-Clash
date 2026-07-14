import { addDaysISO, todayISO, USD_MXN_RATE } from "../format";
import { demoPriceAt } from "../prices";
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
import type {
  DataProvider,
  GroupWithMeta,
  NewProposalInput,
  NewSeasonInput,
  NewTransactionInput,
  ProposalWithVotes,
} from "./provider";

/**
 * Modo demo: todo vive en memoria dentro del proceso del servidor,
 * sembrado con un grupo de ejemplo. Permite probar la app completa
 * sin Supabase ni API keys. Los datos se reinician al reiniciar el server.
 */

interface DemoStore {
  profiles: Profile[];
  groups: Group[];
  members: GroupMember[];
  seasons: Season[];
  participants: SeasonParticipant[];
  proposals: Proposal[];
  votes: Vote[];
  transactions: Transaction[];
  snapshots: Map<string, FundSnapshot[]>; // por seasonId
  customTickers: CustomTicker[];
  counter: number;
}

export const DEMO_USERS: Profile[] = [
  { id: "u-emma", displayName: "Emma" },
  { id: "u-carlos", displayName: "Carlos" },
  { id: "u-sofia", displayName: "Sofía" },
  { id: "u-miguel", displayName: "Miguel" },
];

function seedStore(): DemoStore {
  const today = todayISO();
  const start = addDaysISO(today, -20);
  const end = addDaysISO(start, 45);

  const group: Group = {
    id: "g-demo",
    name: "Los Toros de Wall Street",
    mode: "simulado",
    inviteCode: "TOROS1",
    createdBy: "u-emma",
    createdAt: start + "T10:00:00Z",
  };

  const season: Season = {
    id: "s-demo",
    groupId: group.id,
    name: "Temporada 1",
    startDate: start,
    endDate: end,
    contributionAmount: 500,
    status: "active",
    finalValue: null,
    closedAt: null,
  };

  const store: DemoStore = {
    profiles: [...DEMO_USERS],
    groups: [group],
    members: DEMO_USERS.map((p, i) => ({
      groupId: group.id,
      userId: p.id,
      role: (i === 0 ? "admin" : "member") as MemberRole,
      profile: p,
    })),
    seasons: [season],
    participants: DEMO_USERS.map((p) => ({
      seasonId: season.id,
      userId: p.id,
      contribution: season.contributionAmount,
      profile: p,
    })),
    proposals: [],
    votes: [],
    transactions: [],
    snapshots: new Map(),
    customTickers: [],
    counter: 1,
  };

  // --- Operaciones ejecutadas (con propuestas aprobadas) ---
  const executed: {
    day: number;
    by: string;
    type: "buy" | "sell";
    ticker: string;
    name: string;
    amountUsd?: number;
    sellShares?: number;
    thesis: string;
    votes: [string, VoteValue][];
  }[] = [
    {
      day: 1,
      by: "u-emma",
      type: "buy",
      ticker: "AAPL",
      name: "Apple Inc.",
      amountUsd: 600,
      thesis:
        "Apple sigue recomprando acciones y el iPhone plegable puede sorprender este año.",
      votes: [
        ["u-emma", "yes"],
        ["u-carlos", "yes"],
        ["u-sofia", "yes"],
        ["u-miguel", "no"],
      ],
    },
    {
      day: 3,
      by: "u-carlos",
      type: "buy",
      ticker: "NVDA",
      name: "NVIDIA Corporation",
      amountUsd: 500,
      thesis: "La demanda de chips para IA no se detiene. NVIDIA sigue siendo el rey.",
      votes: [
        ["u-carlos", "yes"],
        ["u-emma", "yes"],
        ["u-miguel", "yes"],
      ],
    },
    {
      day: 6,
      by: "u-sofia",
      type: "buy",
      ticker: "VOO",
      name: "Vanguard S&P 500 ETF",
      amountUsd: 400,
      thesis:
        "Diversificación: una base indexada al S&P 500 nos protege si las tech corrigen.",
      votes: [
        ["u-sofia", "yes"],
        ["u-emma", "yes"],
        ["u-carlos", "yes"],
        ["u-miguel", "yes"],
      ],
    },
    {
      day: 14,
      by: "u-carlos",
      type: "sell",
      ticker: "NVDA",
      name: "NVIDIA Corporation",
      sellShares: -1, // se calcula abajo: la mitad de la posición
      thesis: "Tomemos utilidades de la mitad de NVIDIA tras el rally.",
      votes: [
        ["u-carlos", "yes"],
        ["u-sofia", "yes"],
        ["u-emma", "yes"],
        ["u-miguel", "no"],
      ],
    },
    {
      day: 16,
      by: "u-miguel",
      type: "buy",
      ticker: "TSLA",
      name: "Tesla Inc.",
      amountUsd: 200,
      thesis: "Apuesta contraria: Tesla está castigada y el robotaxi puede ser catalizador.",
      votes: [
        ["u-miguel", "yes"],
        ["u-carlos", "yes"],
        ["u-emma", "yes"],
        ["u-sofia", "no"],
      ],
    },
  ];

  let nvdaShares = 0;
  for (const op of executed) {
    const date = addDaysISO(start, op.day);
    // Precio en pesos (las acciones cotizan en USD; la app muestra MXN).
    const price = demoPriceAt(op.ticker, date) * USD_MXN_RATE;
    let shares: number;
    if (op.type === "buy") {
      shares = Math.round((op.amountUsd! / price) * 10000) / 10000;
      if (op.ticker === "NVDA") nvdaShares += shares;
    } else {
      shares = Math.round((nvdaShares / 2) * 10000) / 10000;
    }
    const total = Math.round(shares * price * 100) / 100;
    const pid = `p-seed-${store.counter}`;
    const txid = `t-seed-${store.counter}`;
    store.counter++;

    store.proposals.push({
      id: pid,
      seasonId: season.id,
      proposedBy: op.by,
      type: op.type,
      ticker: op.ticker,
      companyName: op.name,
      amountUsd: op.type === "buy" ? op.amountUsd! : null,
      shares: op.type === "sell" ? shares : null,
      thesis: op.thesis,
      status: "executed",
      createdAt: addDaysISO(start, op.day - 1) + "T16:00:00Z",
      expiresAt: addDaysISO(start, op.day + 1) + "T16:00:00Z",
    });
    for (const [userId, value] of op.votes) {
      store.votes.push({
        proposalId: pid,
        userId,
        value,
        createdAt: addDaysISO(start, op.day - 1) + "T18:00:00Z",
      });
    }
    store.transactions.push({
      id: txid,
      seasonId: season.id,
      proposalId: pid,
      proposedBy: op.by,
      type: op.type,
      ticker: op.ticker,
      companyName: op.name,
      shares,
      price,
      total,
      executedAt: date + "T15:30:00Z",
    });
  }

  // --- Propuesta rechazada ---
  const rejectedId = `p-seed-${store.counter++}`;
  store.proposals.push({
    id: rejectedId,
    seasonId: season.id,
    proposedBy: "u-miguel",
    type: "buy",
    ticker: "COIN",
    companyName: "Coinbase Global",
    amountUsd: 500,
    shares: null,
    thesis: "El cripto está de vuelta, Coinbase gana comisiones en ambos sentidos.",
    status: "rejected",
    createdAt: addDaysISO(start, 9) + "T16:00:00Z",
    expiresAt: addDaysISO(start, 11) + "T16:00:00Z",
  });
  for (const [userId, value] of [
    ["u-miguel", "yes"],
    ["u-emma", "no"],
    ["u-sofia", "no"],
    ["u-carlos", "no"],
  ] as [string, VoteValue][]) {
    store.votes.push({
      proposalId: rejectedId,
      userId,
      value,
      createdAt: addDaysISO(start, 9) + "T20:00:00Z",
    });
  }

  // --- Propuestas pendientes de votación ---
  const now = new Date();
  const pending1 = `p-seed-${store.counter++}`;
  store.proposals.push({
    id: pending1,
    seasonId: season.id,
    proposedBy: "u-sofia",
    type: "buy",
    ticker: "MSFT",
    companyName: "Microsoft Corporation",
    amountUsd: 300,
    shares: null,
    thesis:
      "Azure crece a doble dígito y Copilot ya genera ingresos reales. Precio razonable tras la corrección.",
    status: "pending",
    createdAt: new Date(now.getTime() - 8 * 3600_000).toISOString(),
    expiresAt: new Date(now.getTime() + 40 * 3600_000).toISOString(),
  });
  // A un voto de aprobarse (necesita 3 de 4)
  store.votes.push(
    {
      proposalId: pending1,
      userId: "u-sofia",
      value: "yes",
      createdAt: new Date(now.getTime() - 7 * 3600_000).toISOString(),
    },
    {
      proposalId: pending1,
      userId: "u-emma",
      value: "yes",
      createdAt: new Date(now.getTime() - 5 * 3600_000).toISOString(),
    },
  );

  const pending2 = `p-seed-${store.counter++}`;
  store.proposals.push({
    id: pending2,
    seasonId: season.id,
    proposedBy: "u-carlos",
    type: "sell",
    ticker: "TSLA",
    companyName: "Tesla Inc.",
    amountUsd: null,
    shares: store.transactions.find((t) => t.ticker === "TSLA")!.shares,
    thesis: "Tesla no ha reaccionado como esperábamos; propongo salir sin más pérdida.",
    status: "pending",
    createdAt: new Date(now.getTime() - 3 * 3600_000).toISOString(),
    expiresAt: new Date(now.getTime() + 45 * 3600_000).toISOString(),
  });
  store.votes.push(
    {
      proposalId: pending2,
      userId: "u-carlos",
      value: "yes",
      createdAt: new Date(now.getTime() - 2 * 3600_000).toISOString(),
    },
    {
      proposalId: pending2,
      userId: "u-miguel",
      value: "no",
      createdAt: new Date(now.getTime() - 1 * 3600_000).toISOString(),
    },
  );

  return store;
}

// Singleton global: sobrevive al hot-reload de Next.js en desarrollo.
const g = globalThis as unknown as { __capitalClashDemo?: DemoStore };
function store(): DemoStore {
  if (!g.__capitalClashDemo) g.__capitalClashDemo = seedStore();
  return g.__capitalClashDemo;
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${store().counter++}`;
}

function inviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++)
    code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export const demoProvider: DataProvider = {
  async getProfile(userId) {
    return store().profiles.find((p) => p.id === userId) ?? null;
  },

  async getGroupsForUser(userId) {
    const s = store();
    return s.members
      .filter((m) => m.userId === userId)
      .map((m) => {
        const group = s.groups.find((gr) => gr.id === m.groupId)!;
        const memberCount = s.members.filter((x) => x.groupId === m.groupId).length;
        return { ...group, role: m.role, memberCount } as GroupWithMeta;
      });
  },

  async getGroup(groupId) {
    return store().groups.find((gr) => gr.id === groupId) ?? null;
  },

  async getMembers(groupId) {
    return store().members.filter((m) => m.groupId === groupId);
  },

  async createGroup(name, mode: GroupMode, userId) {
    const s = store();
    const profile = s.profiles.find((p) => p.id === userId)!;
    const group: Group = {
      id: newId("g"),
      name,
      mode,
      inviteCode: inviteCode(),
      createdBy: userId,
      createdAt: new Date().toISOString(),
    };
    s.groups.push(group);
    s.members.push({ groupId: group.id, userId, role: "admin", profile });
    return group;
  },

  async joinGroup(code, userId) {
    const s = store();
    const group = s.groups.find(
      (gr) => gr.inviteCode.toUpperCase() === code.trim().toUpperCase(),
    );
    if (!group) return null;
    if (!s.members.some((m) => m.groupId === group.id && m.userId === userId)) {
      const profile = s.profiles.find((p) => p.id === userId)!;
      s.members.push({ groupId: group.id, userId, role: "member", profile });
    }
    return group;
  },

  async updateGroup(groupId, fields) {
    const group = store().groups.find((gr) => gr.id === groupId);
    if (!group) return;
    if (fields.name !== undefined) group.name = fields.name;
    if (fields.mode !== undefined) group.mode = fields.mode;
  },

  async deleteGroup(groupId) {
    const s = store();
    const seasonIds = new Set(
      s.seasons.filter((se) => se.groupId === groupId).map((se) => se.id),
    );
    const proposalIds = new Set(
      s.proposals.filter((p) => seasonIds.has(p.seasonId)).map((p) => p.id),
    );
    s.votes = s.votes.filter((v) => !proposalIds.has(v.proposalId));
    s.proposals = s.proposals.filter((p) => !seasonIds.has(p.seasonId));
    s.transactions = s.transactions.filter((t) => !seasonIds.has(t.seasonId));
    s.participants = s.participants.filter((p) => !seasonIds.has(p.seasonId));
    for (const sid of seasonIds) s.snapshots.delete(sid);
    s.seasons = s.seasons.filter((se) => se.groupId !== groupId);
    s.members = s.members.filter((m) => m.groupId !== groupId);
    s.groups = s.groups.filter((gr) => gr.id !== groupId);
  },

  async getSeasons(groupId) {
    return store()
      .seasons.filter((se) => se.groupId === groupId)
      .sort((a, b) => b.startDate.localeCompare(a.startDate));
  },

  async getSeason(seasonId) {
    return store().seasons.find((se) => se.id === seasonId) ?? null;
  },

  async createSeason(input: NewSeasonInput) {
    const s = store();
    const season: Season = {
      id: newId("s"),
      groupId: input.groupId,
      name: input.name,
      startDate: input.startDate,
      endDate: input.endDate,
      contributionAmount: input.contributionAmount,
      status: "active",
      finalValue: null,
      closedAt: null,
    };
    s.seasons.push(season);
    for (const userId of input.participantIds) {
      const profile = s.profiles.find((p) => p.id === userId)!;
      s.participants.push({
        seasonId: season.id,
        userId,
        contribution: input.contributionAmount,
        profile,
      });
    }
    return season;
  },

  async setSeasonStatus(seasonId, status, finalValue) {
    const season = store().seasons.find((se) => se.id === seasonId);
    if (!season) return;
    season.status = status;
    if (status === "closed") {
      season.finalValue = finalValue ?? null;
      season.closedAt = new Date().toISOString();
    }
  },

  async getParticipants(seasonId) {
    return store().participants.filter((p) => p.seasonId === seasonId);
  },

  async getProposals(seasonId) {
    const s = store();
    return s.proposals
      .filter((p) => p.seasonId === seasonId)
      .map((p) => withVotes(p))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async getProposal(proposalId) {
    const p = store().proposals.find((x) => x.id === proposalId);
    return p ? withVotes(p) : null;
  },

  async createProposal(input: NewProposalInput) {
    const s = store();
    const proposal: Proposal = {
      id: newId("p"),
      seasonId: input.seasonId,
      proposedBy: input.proposedBy,
      type: input.type,
      ticker: input.ticker.toUpperCase(),
      companyName: input.companyName,
      amountUsd: input.amountUsd,
      shares: input.shares,
      thesis: input.thesis,
      status: "pending",
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 48 * 3600_000).toISOString(),
    };
    s.proposals.push(proposal);
    return proposal;
  },

  async updateProposal(proposalId, fields) {
    const p = store().proposals.find((x) => x.id === proposalId);
    if (!p) return;
    if (fields.amountUsd !== undefined) p.amountUsd = fields.amountUsd;
    if (fields.shares !== undefined) p.shares = fields.shares;
    if (fields.thesis !== undefined) p.thesis = fields.thesis;
  },

  async deleteProposal(proposalId) {
    const s = store();
    s.votes = s.votes.filter((v) => v.proposalId !== proposalId);
    s.proposals = s.proposals.filter((p) => p.id !== proposalId);
  },

  async clearVotes(proposalId) {
    const s = store();
    s.votes = s.votes.filter((v) => v.proposalId !== proposalId);
  },

  async castVote(proposalId, userId, value) {
    const s = store();
    const existing = s.votes.find(
      (v) => v.proposalId === proposalId && v.userId === userId,
    );
    if (existing) {
      existing.value = value;
    } else {
      s.votes.push({
        proposalId,
        userId,
        value,
        createdAt: new Date().toISOString(),
      });
    }
  },

  async setProposalStatus(proposalId, status: ProposalStatus) {
    const p = store().proposals.find((x) => x.id === proposalId);
    if (p) p.status = status;
  },

  async getTransactions(seasonId) {
    return store()
      .transactions.filter((t) => t.seasonId === seasonId)
      .sort((a, b) => b.executedAt.localeCompare(a.executedAt));
  },

  async addTransaction(input: NewTransactionInput) {
    const tx: Transaction = {
      id: newId("t"),
      executedAt: new Date().toISOString(),
      ...input,
    };
    store().transactions.push(tx);
    return tx;
  },

  async getSnapshots(seasonId) {
    return store().snapshots.get(seasonId) ?? [];
  },

  async upsertSnapshot(seasonId, snapshot) {
    const s = store();
    const list = s.snapshots.get(seasonId) ?? [];
    const idx = list.findIndex((x) => x.date === snapshot.date);
    if (idx >= 0) list[idx] = snapshot;
    else list.push(snapshot);
    list.sort((a, b) => a.date.localeCompare(b.date));
    s.snapshots.set(seasonId, list);
  },

  async getCustomTickers(groupId) {
    return store().customTickers.filter((c) => c.groupId === groupId);
  },

  async createCustomTicker(input) {
    const s = store();
    const ticker: CustomTicker = {
      id: newId("ct"),
      groupId: input.groupId,
      ticker: input.ticker.toUpperCase(),
      companyName: input.companyName,
      priceUsd: input.priceUsd,
      createdBy: input.createdBy,
      createdAt: new Date().toISOString(),
    };
    s.customTickers.push(ticker);
    return ticker;
  },
};

function withVotes(p: Proposal): ProposalWithVotes {
  const s = store();
  return {
    ...p,
    votes: s.votes.filter((v) => v.proposalId === p.id),
    proposerName:
      s.profiles.find((pr) => pr.id === p.proposedBy)?.displayName ?? "—",
  };
}
