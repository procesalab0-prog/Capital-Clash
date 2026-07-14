import { cache } from "react";
import { cookies } from "next/headers";
import { isDemoMode } from "./data/provider";
import type { Profile } from "./types";

export const DEMO_COOKIE = "cc_demo_user";

/**
 * Usuario de la sesión actual (implementación sin caché).
 * - Modo demo: se elige un usuario ficticio en /login (cookie).
 * - Modo Supabase: sesión real de Supabase Auth (llamada de red).
 */
async function fetchSessionUser(): Promise<Profile | null> {
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

/**
 * Para Server Components (layouts, páginas): envuelto en `cache()` porque
 * el layout raíz, el layout del grupo y `getGroupContext` lo consultan por
 * separado dentro del mismo render.
 */
export const getSessionUser = cache(fetchSessionUser);

/**
 * Para Route Handlers (app/api/.../route.ts): React `cache()` está pensado
 * para deduplicar dentro de un mismo árbol de renderizado de Server
 * Components — un Route Handler no participa de ese árbol, así que aquí se
 * usa la versión sin memoizar en vez de `getSessionUser`.
 */
export const getSessionUserForRoute = fetchSessionUser;
