import { NextRequest, NextResponse } from "next/server";
import { getQuotes, applyCustomTickers } from "@/lib/prices";
import { getSessionUserForRoute } from "@/lib/session";
import { getProvider } from "@/lib/data/provider";

/**
 * Cotización actual de un ticker (para mostrar el precio en el formulario).
 * Si se pasa `groupId`, respeta el precio fijo de sus acciones
 * personalizadas por encima de cualquier cotización real/demo.
 */
export async function GET(req: NextRequest) {
  const user = await getSessionUserForRoute();
  if (!user) return NextResponse.json(null, { status: 401 });
  const ticker = (req.nextUrl.searchParams.get("ticker") ?? "").trim().toUpperCase();
  if (!ticker) return NextResponse.json(null, { status: 400 });
  const groupId = req.nextUrl.searchParams.get("groupId");

  const quotes = await getQuotes([ticker]);
  if (groupId) {
    const provider = await getProvider();
    const members = await provider.getMembers(groupId);
    if (members.some((m) => m.userId === user.id)) {
      applyCustomTickers(quotes, await provider.getCustomTickers(groupId));
    }
  }
  return NextResponse.json(quotes.get(ticker) ?? null);
}
