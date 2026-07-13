"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { FundSnapshot } from "@/lib/types";

/**
 * Gráfica de crecimiento del fondo vs S&P 500 (benchmark normalizado al
 * capital inicial). Specs del skill dataviz: líneas 2px, grid hairline
 * sólido, texto en tokens de texto, leyenda para 2 series, tooltip.
 */
export function FundChart({ data }: { data: FundSnapshot[] }) {
  const rows = data.map((d) => ({
    date: d.date,
    fondo: d.fundValue,
    sp500: d.benchmarkValue,
  }));
  const hasBench = rows.some((r) => r.sp500 !== null);

  const money = (v: number) =>
    v.toLocaleString("es-MX", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    });
  const shortDate = (iso: string) =>
    new Date(iso + "T12:00:00").toLocaleDateString("es-MX", {
      day: "numeric",
      month: "short",
    });

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-4 text-xs font-bold text-muted">
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ background: "var(--accent)" }}
          />
          Fondo
        </span>
        {hasBench && (
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: "var(--muted)" }}
            />
            S&P 500 (misma inversión)
          </span>
        )}
      </div>
      <div className="h-64 w-full sm:h-72">
        <ResponsiveContainer>
          <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 4 }}>
            <CartesianGrid
              stroke="var(--line)"
              strokeWidth={1}
              strokeOpacity={0.2}
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tickFormatter={shortDate}
              tick={{ fill: "var(--muted)", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "var(--line)" }}
              minTickGap={40}
            />
            <YAxis
              tickFormatter={money}
              tick={{ fill: "var(--muted)", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={70}
              domain={["auto", "auto"]}
            />
            <Tooltip
              cursor={{ stroke: "var(--muted)", strokeWidth: 1 }}
              contentStyle={{
                background: "var(--surface)",
                border: "2.5px solid var(--line)",
                borderRadius: 12,
                boxShadow: "3px 3px 0 var(--line)",
                color: "var(--ink)",
                fontSize: 12,
                fontWeight: 700,
              }}
              labelFormatter={(l) => shortDate(String(l))}
              formatter={(value, name) => [
                money(Number(value)),
                name === "fondo" ? "Fondo" : "S&P 500",
              ]}
            />
            {hasBench && (
              <Line
                type="monotone"
                dataKey="sp500"
                stroke="var(--muted)"
                strokeWidth={3}
                strokeLinecap="round"
                dot={false}
                activeDot={{ r: 5, stroke: "var(--ink)", strokeWidth: 2.5 }}
                isAnimationActive={false}
              />
            )}
            <Line
              type="monotone"
              dataKey="fondo"
              stroke="var(--accent)"
              strokeWidth={4}
              strokeLinecap="round"
              dot={false}
              activeDot={{ r: 6, stroke: "var(--ink)", strokeWidth: 2.5 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
