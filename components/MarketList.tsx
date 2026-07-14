"use client";

import { useState } from "react";
import Link from "next/link";
import { PnlText, SubCard } from "@/components/ui";

interface MarketQuote {
  ticker: string;
  name: string;
  price: number;
  changePct: number | null;
}

const money = (v: number) =>
  v.toLocaleString("es-MX", { style: "currency", currency: "MXN" });

/**
 * Lista de acciones del Mercado con buscador. Cualquier miembro puede ver
 * los precios; si hay temporada activa, cada acción enlaza a proponer compra.
 */
export function MarketList({
  quotes,
  groupId,
  canPropose,
}: {
  quotes: MarketQuote[];
  groupId: string;
  canPropose: boolean;
}) {
  const [q, setQ] = useState("");
  const query = q.trim().toUpperCase();
  const filtered = query
    ? quotes.filter(
        (x) =>
          x.ticker.includes(query) || x.name.toUpperCase().includes(query),
      )
    : quotes;

  return (
    <div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar empresa o símbolo (ej. Apple, NVDA)…"
        className="mb-4 w-full rounded-xl border-[2.5px] border-line bg-bg px-3 py-2.5 text-sm font-semibold outline-none placeholder:font-medium placeholder:text-muted focus:border-accent"
      />
      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm font-semibold text-muted">
          No encontramos “{q}”. Puedes proponer cualquier acción por su símbolo
          en la pestaña Propuestas.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => (
            <SubCard key={s.ticker} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="figures font-extrabold">{s.ticker}</p>
                  <p className="truncate text-xs font-semibold text-muted">
                    {s.name}
                  </p>
                </div>
                {s.changePct !== null && (
                  <PnlText pct={s.changePct} className="shrink-0 text-xs" />
                )}
              </div>
              <p className="figures mt-3 text-xl font-extrabold">
                {money(s.price)}
              </p>
              {canPropose && (
                <Link
                  href={`/g/${groupId}/propuestas?ticker=${encodeURIComponent(s.ticker)}&name=${encodeURIComponent(s.name)}`}
                  className="mt-3 inline-flex w-full items-center justify-center rounded-lg border-[2.5px] border-line bg-surface px-3 py-2 text-xs font-extrabold text-ink transition hover:bg-bg"
                >
                  Proponer compra →
                </Link>
              )}
            </SubCard>
          ))}
        </div>
      )}
    </div>
  );
}
