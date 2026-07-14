"use client";

import { useEffect, useRef, useState } from "react";
import { btnPrimary, inputCls, PnlText } from "@/components/ui";
import type { Quote, TickerSearchResult } from "@/lib/types";

interface SellablePosition {
  ticker: string;
  companyName: string;
  shares: number;
}

const money = (v: number) =>
  v.toLocaleString("es-MX", { style: "currency", currency: "MXN" });

/**
 * Formulario para proponer una operación al grupo.
 * Compra: buscador de ticker + monto USD. Venta: se elige una posición.
 * Muestra el precio actual de la acción seleccionada para que todos lo vean.
 */
export function ProposalForm({
  action,
  positions,
  cash,
  initialTicker,
  initialName,
}: {
  action: (formData: FormData) => void;
  positions: SellablePosition[];
  cash: number;
  initialTicker?: string;
  initialName?: string;
}) {
  const hasInitial = Boolean(initialTicker);
  const [type, setType] = useState<"buy" | "sell">("buy");
  const [query, setQuery] = useState(
    hasInitial ? `${initialTicker} — ${initialName ?? initialTicker}` : "",
  );
  const [results, setResults] = useState<TickerSearchResult[]>([]);
  const [selected, setSelected] = useState<TickerSearchResult | null>(
    hasInitial ? { ticker: initialTicker!, name: initialName ?? initialTicker! } : null,
  );
  const [open, setOpen] = useState(false);
  const [sellTicker, setSellTicker] = useState(positions[0]?.ticker ?? "");
  const [amount, setAmount] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
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

  // Ticker activo según el modo (compra: seleccionado; venta: posición).
  const activeTicker = type === "buy" ? selected?.ticker ?? null : sellTicker || null;

  // Cotización actual del ticker activo.
  useEffect(() => {
    if (!activeTicker) {
      setQuote(null);
      return;
    }
    let cancelled = false;
    setLoadingQuote(true);
    fetch(`/api/quote?ticker=${encodeURIComponent(activeTicker)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((q) => {
        if (!cancelled) setQuote(q);
      })
      .catch(() => {
        if (!cancelled) setQuote(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingQuote(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTicker]);

  const sellPos = positions.find((p) => p.ticker === sellTicker);
  const amountNum = Number(amount);
  const estShares =
    quote && Number.isFinite(amountNum) && amountNum > 0 && quote.price > 0
      ? amountNum / quote.price
      : null;

  function PriceBox() {
    if (!activeTicker) return null;
    return (
      <div className="rounded-xl border-[2.5px] border-line bg-bg px-3 py-2.5">
        {loadingQuote && !quote ? (
          <p className="text-xs font-semibold text-muted">Consultando precio…</p>
        ) : quote ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
                Precio actual · {quote.ticker}
              </p>
              <p className="figures text-lg font-extrabold">{money(quote.price)}</p>
            </div>
            {quote.changePct !== null && <PnlText pct={quote.changePct} className="text-xs" />}
          </div>
        ) : (
          <p className="text-xs font-semibold text-muted">
            Precio no disponible por ahora.
          </p>
        )}
      </div>
    );
  }

  return (
    <form action={action} className="grid gap-3">
      <div className="grid grid-cols-2 gap-1 rounded-xl border-[2.5px] border-line p-1 text-sm font-extrabold">
        {(["buy", "sell"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`rounded-lg py-1.5 transition ${
              type === t ? "bg-ink text-bg" : "text-muted"
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
              <ul className="hard-shadow-sm absolute z-10 mt-1 w-full overflow-hidden rounded-xl border-[2.5px] border-line bg-surface">
                {results.map((r) => (
                  <li key={r.ticker}>
                    <button
                      type="button"
                      className="flex w-full items-baseline gap-2 px-3 py-2 text-left text-sm font-semibold hover:bg-bg"
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
          <input
            type="hidden"
            name="ticker"
            value={selected?.ticker ?? query.trim().toUpperCase()}
          />
          <input type="hidden" name="companyName" value={selected?.name ?? ""} />
          <PriceBox />
          <div>
            <input
              className={inputCls}
              name="amountUsd"
              type="number"
              min="1"
              step="0.01"
              placeholder="Monto a invertir (MXN)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <p className="mt-1 text-xs font-semibold text-muted">
              Efectivo disponible: <span className="figures">{money(cash)}</span>
              {estShares !== null && (
                <>
                  {" "}
                  · ≈{" "}
                  <span className="figures">
                    {estShares.toLocaleString("es-MX", { maximumFractionDigits: 4 })}
                  </span>{" "}
                  títulos
                </>
              )}
            </p>
          </div>
        </>
      ) : positions.length === 0 ? (
        <p className="rounded-xl border-[2.5px] border-line px-3 py-2 text-sm font-semibold text-muted">
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
                {p.ticker} — {p.companyName} (
                {p.shares.toLocaleString("es-MX", { maximumFractionDigits: 4 })} títulos)
              </option>
            ))}
          </select>
          <input type="hidden" name="ticker" value={sellTicker} />
          <input type="hidden" name="companyName" value={sellPos?.companyName ?? ""} />
          <PriceBox />
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
      <p className="text-xs font-semibold text-muted">
        Al proponer, tu voto cuenta automáticamente como “sí”. La propuesta
        expira en 48 horas si no se decide.
      </p>
    </form>
  );
}
