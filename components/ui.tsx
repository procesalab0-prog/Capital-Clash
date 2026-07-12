import Link from "next/link";
import type { ReactNode } from "react";
import { fmtMoneySigned, fmtPct } from "@/lib/format";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-line bg-surface p-4 sm:p-5 ${className}`}
    >
      {children}
    </div>
  );
}

/** Texto de ganancia/pérdida: color + signo + flecha (nunca solo color). */
export function PnlText({
  value,
  pct,
  className = "",
}: {
  value?: number;
  pct?: number;
  className?: string;
}) {
  const ref = value ?? pct ?? 0;
  const dir = ref > 0.0001 ? "up" : ref < -0.0001 ? "down" : "flat";
  const color =
    dir === "up" ? "text-gain" : dir === "down" ? "text-loss" : "text-ink2";
  const arrow = dir === "up" ? "▲" : dir === "down" ? "▼" : "―";
  return (
    <span className={`figures ${color} ${className}`}>
      <span aria-hidden className="mr-1 text-[0.7em] align-middle">
        {arrow}
      </span>
      {value !== undefined && fmtMoneySigned(value)}
      {value !== undefined && pct !== undefined && " · "}
      {pct !== undefined && fmtPct(pct)}
    </span>
  );
}

export function StatCard({
  label,
  value,
  delta,
  deltaPct,
  hero = false,
}: {
  label: string;
  value: string;
  delta?: number;
  deltaPct?: number;
  hero?: boolean;
}) {
  return (
    <Card>
      <p className="text-sm text-ink2">{label}</p>
      <p
        className={`mt-1 font-semibold tracking-tight ${
          hero ? "text-3xl sm:text-4xl" : "text-2xl"
        }`}
      >
        {value}
      </p>
      {(delta !== undefined || deltaPct !== undefined) && (
        <p className="mt-1 text-sm">
          <PnlText value={delta} pct={deltaPct} />
        </p>
      )}
    </Card>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "accent" | "gain" | "loss" | "warn";
}) {
  const tones: Record<string, string> = {
    neutral: "border-line text-ink2",
    accent: "border-accent/40 text-accent",
    gain: "border-gain/40 text-gain",
    loss: "border-loss/40 text-loss",
    warn: "border-warn/60 text-ink2",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <Card className="py-10 text-center">
      <p className="font-medium text-ink2">{title}</p>
      {hint && <p className="mx-auto mt-1 max-w-md text-sm text-muted">{hint}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </Card>
  );
}

export const btnPrimary =
  "inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition";
export const btnGhost =
  "inline-flex items-center justify-center rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink2 hover:bg-line/40 transition";
export const inputCls =
  "w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent";

export function PageTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-ink2">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="text-sm text-accent hover:underline">
      ← {label}
    </Link>
  );
}
