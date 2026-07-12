import { cookies } from "next/headers";
import { isDemoMode } from "./data/provider";
import type { Profile } from "./types";

export const DEMO_COOKIE = "cc_demo_user";

/**
 * Usuario de la sesión actual.
 * - Modo demo: se elige un usuario ficticio en /login (cookie).
 * - Modo Supabase: sesión real de Supabase Auth.
 */
export async function getSessionUser(): Promise<Profile | null> {
  if (isDemoMode()) {
    const jar = await cookies();
    const id = jar.get(DEMO_COOKIE)?.value;
    if (!id) return null;
    const { DEMO_USERS } = await import("./data/demo");
    return DEMO_USERS.find((u) => u.id === id) ?? null;
  }
  const { getSupabaseSessionUser } = await import("./data/supabase");
  return getSupabaseSessionUser();
}
