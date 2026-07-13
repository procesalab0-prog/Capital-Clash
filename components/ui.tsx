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
      className={`hard-shadow rounded-2xl border-[3px] border-line bg-surface p-4 sm:p-5 ${className}`}
    >
      {children}
    </div>
  );
}

/** Tarjeta secundaria: borde más delgado, sin sombra (filas, sub-bloques). */
export function SubCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border-[2.5px] border-line bg-surface ${className}`}>
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
      <span aria-hidden className="mr-1 align-middle text-[0.7em]">
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
      <p className="text-xs font-bold uppercase tracking-wide text-muted">
        {label}
      </p>
      <p
        className={`figures mt-1 tracking-tight ${
          hero ? "text-3xl font-extrabold sm:text-4xl" : "text-2xl"
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
  tone?: "neutral" | "accent" | "gain" | "loss" | "warn" | "ink";
}) {
  const tones: Record<string, string> = {
    neutral: "border-[2.5px] border-line bg-surface text-ink",
    ink: "bg-ink text-bg",
    accent: "bg-accent text-white",
    gain: "bg-gain text-ink",
    loss: "bg-loss text-white",
    warn: "bg-yellow text-[#1d2633]",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/** Colores de avatar del pase Naive; texto tinta sobre amarillo/naranja. */
const AVATAR_COLORS = ["#E63946", "#2DBE7F", "#FFD65A", "#4D8CFF", "#FF9F43"];

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function avatarColor(userId: string): string {
  return AVATAR_COLORS[hashCode(userId) % AVATAR_COLORS.length];
}

export function Avatar({
  userId,
  name,
  size = 40,
}: {
  userId: string;
  name: string;
  size?: number;
}) {
  const bg = avatarColor(userId);
  const dark = bg === "#FFD65A" || bg === "#FF9F43";
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-full border-[2.5px] border-line font-black"
      style={{
        width: size,
        height: size,
        background: bg,
        color: dark ? "#1d2633" : "#ffffff",
        fontSize: size * 0.4,
      }}
    >
      {name[0]?.toUpperCase() ?? "?"}
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
      <p className="font-extrabold">{title}</p>
      {hint && <p className="mx-auto mt-1 max-w-md text-sm font-medium text-ink2">{hint}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </Card>
  );
}

export const btnPrimary =
  "hard-shadow-sm inline-flex items-center justify-center rounded-xl border-[3px] border-line bg-accent px-4 py-2.5 text-sm font-black text-white transition active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-50 cursor-pointer";
export const btnGain =
  "hard-shadow-sm inline-flex items-center justify-center rounded-xl border-[3px] border-line bg-gain px-4 py-2.5 text-sm font-black text-ink transition active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-50 cursor-pointer";
export const btnGhost =
  "inline-flex items-center justify-center rounded-xl border-[2.5px] border-line bg-surface px-4 py-2.5 text-sm font-extrabold text-ink transition hover:bg-bg disabled:opacity-50 cursor-pointer";
export const inputCls =
  "w-full rounded-xl border-[2.5px] border-line bg-bg px-3 py-2.5 text-sm font-semibold text-ink outline-none placeholder:font-medium placeholder:text-muted focus:border-accent";

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
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{title}</h1>
        {subtitle && (
          <p className="mt-0.5 text-sm font-semibold text-ink2">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="text-sm font-bold text-accent hover:underline">
      ← {label}
    </Link>
  );
}
