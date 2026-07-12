const currencyFmt = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const compactCurrencyFmt = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function fmtMoney(value: number): string {
  return currencyFmt.format(value);
}

export function fmtMoneyCompact(value: number): string {
  return compactCurrencyFmt.format(value);
}

/** Porcentaje con signo explícito: +12.34% / −5.67% */
export function fmtPct(value: number, digits = 2): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${Math.abs(value).toFixed(digits)}%`;
}

/** Dinero con signo explícito: +$120.00 / −$45.00 */
export function fmtMoneySigned(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${currencyFmt.format(Math.abs(value))}`;
}

export function fmtShares(value: number): string {
  return value.toLocaleString("es-MX", { maximumFractionDigits: 4 });
}

export function fmtDate(iso: string): string {
  return new Date(iso + (iso.length === 10 ? "T12:00:00" : "")).toLocaleDateString(
    "es-MX",
    { day: "numeric", month: "short", year: "numeric" },
  );
}

export function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("es-MX", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function daysBetween(fromISO: string, toISO: string): number {
  const ms = new Date(toISO).getTime() - new Date(fromISO).getTime();
  return Math.round(ms / 86_400_000);
}

export function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso + (iso.length === 10 ? "T12:00:00Z" : ""));
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
