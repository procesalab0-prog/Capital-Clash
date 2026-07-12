import { NextRequest, NextResponse } from "next/server";
import { searchTickers } from "@/lib/prices";
import { getSessionUser } from "@/lib/session";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json([], { status: 401 });
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const results = await searchTickers(q);
  return NextResponse.json(results);
}
