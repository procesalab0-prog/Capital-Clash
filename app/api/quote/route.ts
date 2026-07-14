import { NextRequest, NextResponse } from "next/server";
import { getQuote } from "@/lib/prices";
import { getSessionUser } from "@/lib/session";

/** Cotización actual de un ticker (para mostrar el precio en el formulario). */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json(null, { status: 401 });
  const ticker = (req.nextUrl.searchParams.get("ticker") ?? "").trim().toUpperCase();
  if (!ticker) return NextResponse.json(null, { status: 400 });
  const quote = await getQuote(ticker);
  return NextResponse.json(quote);
}
