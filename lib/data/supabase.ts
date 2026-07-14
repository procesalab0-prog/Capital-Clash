import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CustomTicker,
  FundSnapshot,
  Group,
  GroupMember,
  Profile,
  Proposal,
  Season,
  SeasonParticipant,
  Transaction,
  Vote,
} from "../types";
import type {
  DataProvider,
  GroupWithMeta,
  ProposalWithVotes,
} from "./provider";

/**
 * Implementación con Supabase (Postgres + Auth + RLS).
 * El esquema vive en supabase/schema.sql. Las políticas RLS garantizan que
 * cada usuario solo vea los grupos donde es miembro; aquí no se re-verifica
 * cada permiso (la base lo hace), solo se mapean datos.
 */

async function client(): Promise<SupabaseClient> {
  const jar = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => jar.getAll(),
        setAll: (list) => {
          try {
            for (const { name, value, options } of list) {
              jar.set(name, value, options);
            }
          } catch {
            // En Server Components no se pueden escribir cookies; el
            // middleware se encarga de refrescar la sesión.
          }
        },
      },
    },
  );
}

export async function getSupabaseSessionUser(): Promise<Profile | null> {
  const supabase = await client();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name")
    .eq("id", user.id)
    .single();
  return {
    id: user.id,
    displayName:
      data?.display_name ??
      (user.user_metadata?.display_name as string) ??
      user.email ??
      "Jugador",
  };
}

export async function supabaseSignOut(): Promise<void> {
  const supabase = await client();
  await supabase.auth.signOut();
}

// ---- Mapeo de filas ----

/* eslint-disable @typescript-eslint/no-explicit-any */

function mapGroup(r: any): Group {
  return {
    id: r.id,
    name: r.name,
    mode: r.mode,
    inviteCode: r.invite_code,
    createdBy: r.created_by,
    createdAt: r.created_at,
  };
}

function mapSeason(r: any): Season {
  return {
    id: r.id,
    groupId: r.group_id,
    name: r.name,
    startDate: r.start_date,
    endDate: r.end_date,
    contributionAmount: Number(r.contribution_amount),
    status: r.status,
    finalValue: r.final_value === null ? null : Number(r.final_value),
    closedAt: r.closed_at,
  };
}

function mapProposal(r: any): Proposal {
  return {
    id: r.id,
    seasonId: r.season_id,
    proposedBy: r.proposed_by,
    type: r.type,
    ticker: r.ticker,
    companyName: r.company_name,
    amountUsd: r.amount_usd === null ? null : Number(r.amount_usd),
    shares: r.shares === null ? null : Number(r.shares),
    thesis: r.thesis,
    status: r.status,
    createdAt: r.created_at,
    expiresAt: r.expires_at,
  };
}

function mapTransaction(r: any): Transaction {
  return {
    id: r.id,
    seasonId: r.season_id,
    proposalId: r.proposal_id,
    proposedBy: r.proposed_by,
    type: r.type,
    ticker: r.ticker,
    companyName: r.company_name,
    shares: Number(r.shares),
    price: Number(r.price),
    total: Number(r.total),
    executedAt: r.executed_at,
  };
}

function mapVote(r: any): Vote {
  return {
    proposalId: r.proposal_id,
    userId: r.user_id,
    value: r.value,
    createdAt: r.created_at,
  };
}

export function createSupabaseProvider(): DataProvider {
  return {
    async getProfile(userId) {
      const supabase = await client();
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name")
        .eq("id", userId)
        .single();
      return data ? { id: data.id, displayName: data.display_name } : null;
    },

    async getGroupsForUser(userId) {
      const supabase = await client();
      const { data, error } = await supabase
        .from("group_members")
        .select("role, groups(*), group_id")
        .eq("user_id", userId);
      if (error) throw error;
      const out: GroupWithMeta[] = [];
      for (const row of data ?? []) {
        const g = (row as any).groups;
        if (!g) continue;
        const { count } = await supabase
          .from("group_members")
          .select("*", { count: "exact", head: true })
          .eq("group_id", g.id);
        out.push({ ...mapGroup(g), role: (row as any).role, memberCount: count ?? 1 });
      }
      return out;
    },

    async getGroup(groupId) {
      const supabase = await client();
      const { data } = await supabase
        .from("groups")
        .select("*")
        .eq("id", groupId)
        .maybeSingle();
      return data ? mapGroup(data) : null;
    },

    async getMembers(groupId) {
      const supabase = await client();
      const { data, error } = await supabase
        .from("group_members")
        .select("group_id, user_id, role, profiles(id, display_name)")
        .eq("group_id", groupId);
      if (error) throw error;
      return (data ?? []).map(
        (r: any): GroupMember => ({
          groupId: r.group_id,
          userId: r.user_id,
          role: r.role,
          profile: {
            id: r.user_id,
            displayName: r.profiles?.display_name ?? "Jugador",
          },
        }),
      );
    },

    async createGroup(name, mode) {
      const supabase = await client();
      const { data, error } = await supabase
        .rpc("create_group", { p_name: name, p_mode: mode })
        .single();
      if (error) throw error;
      return mapGroup(data);
    },

    async joinGroup(inviteCode) {
      const supabase = await client();
      const { data, error } = await supabase
        .rpc("join_group_with_code", { p_code: inviteCode.trim().toUpperCase() })
        .maybeSingle();
      if (error || !data) return null;
      return mapGroup(data);
    },

    async updateGroup(groupId, fields) {
      const supabase = await client();
      const patch: Record<string, unknown> = {};
      if (fields.name !== undefined) patch.name = fields.name;
      if (fields.mode !== undefined) patch.mode = fields.mode;
      if (Object.keys(patch).length === 0) return;
      const { error } = await supabase
        .from("groups")
        .update(patch)
        .eq("id", groupId);
      if (error) throw error;
    },

    async deleteGroup(groupId) {
      const supabase = await client();
      const { error } = await supabase.from("groups").delete().eq("id", groupId);
      if (error) throw error;
    },

    async getSeasons(groupId) {
      const supabase = await client();
      const { data } = await supabase
        .from("seasons")
        .select("*")
        .eq("group_id", groupId)
        .order("start_date", { ascending: false });
      return (data ?? []).map(mapSeason);
    },

    async getSeason(seasonId) {
      const supabase = await client();
      const { data } = await supabase
        .from("seasons")
        .select("*")
        .eq("id", seasonId)
        .maybeSingle();
      return data ? mapSeason(data) : null;
    },

    async createSeason(input) {
      const supabase = await client();
      const { data, error } = await supabase
        .from("seasons")
        .insert({
          group_id: input.groupId,
          name: input.name,
          start_date: input.startDate,
          end_date: input.endDate,
          contribution_amount: input.contributionAmount,
          status: "active",
        })
        .select()
        .single();
      if (error) throw error;
      const season = mapSeason(data);
      const { error: pErr } = await supabase.from("season_participants").insert(
        input.participantIds.map((userId) => ({
          season_id: season.id,
          user_id: userId,
          contribution: input.contributionAmount,
        })),
      );
      if (pErr) throw pErr;
      return season;
    },

    async setSeasonStatus(seasonId, status, finalValue) {
      const supabase = await client();
      const patch: Record<string, unknown> = { status };
      if (status === "closed") {
        patch.final_value = finalValue ?? null;
        patch.closed_at = new Date().toISOString();
      }
      const { error } = await supabase
        .from("seasons")
        .update(patch)
        .eq("id", seasonId);
      if (error) throw error;
    },

    async getParticipants(seasonId) {
      const supabase = await client();
      const { data, error } = await supabase
        .from("season_participants")
        .select("season_id, user_id, contribution, profiles(id, display_name)")
        .eq("season_id", seasonId);
      if (error) throw error;
      return (data ?? []).map(
        (r: any): SeasonParticipant => ({
          seasonId: r.season_id,
          userId: r.user_id,
          contribution: Number(r.contribution),
          profile: {
            id: r.user_id,
            displayName: r.profiles?.display_name ?? "Jugador",
          },
        }),
      );
    },

    async getProposals(seasonId) {
      const supabase = await client();
      const { data, error } = await supabase
        .from("proposals")
        .select("*, votes(*), profiles!proposals_proposed_by_fkey(display_name)")
        .eq("season_id", seasonId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(
        (r: any): ProposalWithVotes => ({
          ...mapProposal(r),
          votes: (r.votes ?? []).map(mapVote),
          proposerName: r.profiles?.display_name ?? "—",
        }),
      );
    },

    async getProposal(proposalId) {
      const supabase = await client();
      const { data } = await supabase
        .from("proposals")
        .select("*, votes(*), profiles!proposals_proposed_by_fkey(display_name)")
        .eq("id", proposalId)
        .maybeSingle();
      if (!data) return null;
      return {
        ...mapProposal(data),
        votes: ((data as any).votes ?? []).map(mapVote),
        proposerName: (data as any).profiles?.display_name ?? "—",
      };
    },

    async createProposal(input) {
      const supabase = await client();
      const { data, error } = await supabase
        .from("proposals")
        .insert({
          season_id: input.seasonId,
          proposed_by: input.proposedBy,
          type: input.type,
          ticker: input.ticker.toUpperCase(),
          company_name: input.companyName,
          amount_usd: input.amountUsd,
          shares: input.shares,
          thesis: input.thesis,
          status: "pending",
          expires_at: new Date(Date.now() + 48 * 3600_000).toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      return mapProposal(data);
    },

    async updateProposal(proposalId, fields) {
      const supabase = await client();
      const patch: Record<string, unknown> = {};
      if (fields.amountUsd !== undefined) patch.amount_usd = fields.amountUsd;
      if (fields.shares !== undefined) patch.shares = fields.shares;
      if (fields.thesis !== undefined) patch.thesis = fields.thesis;
      if (Object.keys(patch).length === 0) return;
      const { error } = await supabase
        .from("proposals")
        .update(patch)
        .eq("id", proposalId);
      if (error) throw error;
    },

    async deleteProposal(proposalId) {
      const supabase = await client();
      const { error } = await supabase
        .from("proposals")
        .delete()
        .eq("id", proposalId);
      if (error) throw error;
    },

    async clearVotes(proposalId) {
      const supabase = await client();
      const { error } = await supabase
        .from("votes")
        .delete()
        .eq("proposal_id", proposalId);
      if (error) throw error;
    },

    async castVote(proposalId, userId, value) {
      const supabase = await client();
      const { error } = await supabase
        .from("votes")
        .upsert(
          { proposal_id: proposalId, user_id: userId, value },
          { onConflict: "proposal_id,user_id" },
        );
      if (error) throw error;
    },

    async setProposalStatus(proposalId, status) {
      const supabase = await client();
      const { error } = await supabase
        .from("proposals")
        .update({ status })
        .eq("id", proposalId);
      if (error) throw error;
    },

    async getTransactions(seasonId) {
      const supabase = await client();
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("season_id", seasonId)
        .order("executed_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(mapTransaction);
    },

    async addTransaction(input) {
      const supabase = await client();
      const { data, error } = await supabase
        .from("transactions")
        .insert({
          season_id: input.seasonId,
          proposal_id: input.proposalId,
          proposed_by: input.proposedBy,
          type: input.type,
          ticker: input.ticker,
          company_name: input.companyName,
          shares: input.shares,
          price: input.price,
          total: input.total,
        })
        .select()
        .single();
      if (error) throw error;
      return mapTransaction(data);
    },

    async getSnapshots(seasonId) {
      const supabase = await client();
      const { data } = await supabase
        .from("fund_snapshots")
        .select("*")
        .eq("season_id", seasonId)
        .order("date", { ascending: true });
      return (data ?? []).map(
        (r: any): FundSnapshot => ({
          date: r.date,
          fundValue: Number(r.fund_value),
          benchmarkValue:
            r.benchmark_value === null ? null : Number(r.benchmark_value),
        }),
      );
    },

    async upsertSnapshot(seasonId, snapshot) {
      const supabase = await client();
      const { error } = await supabase.from("fund_snapshots").upsert(
        {
          season_id: seasonId,
          date: snapshot.date,
          fund_value: snapshot.fundValue,
          benchmark_value: snapshot.benchmarkValue,
        },
        { onConflict: "season_id,date" },
      );
      if (error) throw error;
    },

    async getCustomTickers(groupId) {
      const supabase = await client();
      const { data, error } = await supabase
        .from("custom_tickers")
        .select("*")
        .eq("group_id", groupId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map(
        (r: any): CustomTicker => ({
          id: r.id,
          groupId: r.group_id,
          ticker: r.ticker,
          companyName: r.company_name,
          priceUsd: Number(r.price_usd),
          createdBy: r.created_by,
          createdAt: r.created_at,
        }),
      );
    },

    async createCustomTicker(input) {
      const supabase = await client();
      const { data, error } = await supabase
        .from("custom_tickers")
        .insert({
          group_id: input.groupId,
          ticker: input.ticker.toUpperCase(),
          company_name: input.companyName,
          price_usd: input.priceUsd,
          created_by: input.createdBy,
        })
        .select()
        .single();
      if (error) throw error;
      return {
        id: data.id,
        groupId: data.group_id,
        ticker: data.ticker,
        companyName: data.company_name,
        priceUsd: Number(data.price_usd),
        createdBy: data.created_by,
        createdAt: data.created_at,
      };
    },
  };
}
