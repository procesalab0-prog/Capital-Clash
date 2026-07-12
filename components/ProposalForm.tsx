"use client";

import { useEffect, useRef, useState } from "react";
import { btnPrimary, inputCls } from "@/components/ui";
import type { TickerSearchResult } from "@/lib/types";

interface SellablePosition {
  ticker: string;
  companyName: string;
  shares: number;
}

/**
 * Formulario para proponer una operación al grupo.
 * Compra: buscador de ticker + monto USD. Venta: se elige una posición.
 */
export function ProposalForm({
  action,
  positions,
  cash,
}: {
  action: (formData: FormData) => void;
  positions: SellablePosition[];
  cash: number;
}) {
  const [type, setType] = useState<"buy" | "sell">("buy");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TickerSearchResult[]>([]);
  const [selected, setSelected] = useState<TickerSearchResult | null>(null);
  const [open, setOpen] = useState(false);
  const [sellTicker, setSellTicker] = useState(positions[0]?.ticker ?? "");
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (!query.trim() || (selected && query === `${selected.ticker} — ${selected.name}`)) {
      setResults([]);
      return;
    }
    debounce.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/tickers?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          setResults(await res.json());
          setOpen(true);
        }
      } catch {
        setResults([]);
      }
    }, 250);
  }, [query, selected]);

  const sellPos = positions.find((p) => p.ticker === sellTicker);

  return (
    <form action={action} className="grid gap-3">
      <div className="grid grid-cols-2 gap-1 rounded-lg border border-line p-1 text-sm font-medium">
        {(["buy", "sell"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`rounded-md py-1.5 transition ${
              type === t ? "bg-accent text-white" : "text-ink2"
            }`}
          >
            {t === "buy" ? "Comprar" : "Vender"}
          </button>
        ))}
      </div>
      <input type="hidden" name="type" value={type} />

      {type === "buy" ? (
        <>
          <div className="relative">
            <input
              className={inputCls}
              placeholder="Busca una acción (ej. AAPL, Microsoft…)"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelected(null);
              }}
              onFocus={() => results.length > 0 && setOpen(true)}
              autoComplete="off"
              required
            />
            {open && results.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-line bg-surface shadow-lg">
                {results.map((r) => (
                  <li key={r.ticker}>
                    <button
                      type="button"
                      className="flex w-full items-baseline gap-2 px-3 py-2 text-left text-sm hover:bg-line/40"
                      onClick={() => {
                        setSelected(r);
                        setQuery(`${r.ticker} — ${r.name}`);
                        setOpen(false);
                      }}
                    >
                      <span className="figures font-semibold">{r.ticker}</span>
                      <span className="truncate text-ink2">{r.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <input type="hidden" name="ticker" value={selected?.ticker ?? query.trim().toUpperCase()} />
          <input type="hidden" name="companyName" value={selected?.name ?? ""} />
          <div>
            <input
              className={inputCls}
              name="amountUsd"
              type="number"
              min="1"
              step="0.01"
              placeholder="Monto a invertir (USD)"
              required
            />
            <p className="mt-1 text-xs text-muted">
              Efectivo disponible del fondo:{" "}
              <span className="figures">
                {cash.toLocaleString("es-MX", {
                  style: "currency",
                  currency: "USD",
                })}
              </span>
            </p>
          </div>
        </>
      ) : positions.length === 0 ? (
        <p className="rounded-lg border border-line px-3 py-2 text-sm text-muted">
          No hay posiciones que vender todavía.
        </p>
      ) : (
        <>
          <select
            className={inputCls}
            value={sellTicker}
            onChange={(e) => setSellTicker(e.target.value)}
          >
            {positions.map((p) => (
              <option key={p.ticker} value={p.ticker}>
                {p.ticker} — {p.companyName} ({p.shares.toLocaleString("es-MX", { maximumFractionDigits: 4 })} títulos)
              </option>
            ))}
          </select>
          <input type="hidden" name="ticker" value={sellTicker} />
          <input type="hidden" name="companyName" value={sellPos?.companyName ?? ""} />
          <input
            className={inputCls}
            name="shares"
            type="number"
            min="0.0001"
            max={sellPos?.shares}
            step="0.0001"
            defaultValue={sellPos?.shares}
            placeholder="Títulos a vender"
            required
          />
        </>
      )}

      <textarea
        className={`${inputCls} min-h-20`}
        name="thesis"
        placeholder="Tu tesis: ¿por qué el grupo debería aprobar esta operación?"
        required
      />
      <button
        className={btnPrimary}
        disabled={type === "sell" && positions.length === 0}
      >
        Proponer al grupo
      </button>
      <p className="text-xs text-muted">
        Al proponer, tu voto cuenta automáticamente como “sí”. La propuesta
        expira en 48 horas si no se decide.
      </p>
    </form>
  );
}
