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
      <div className="mb-2 flex flex-wrap gap-4 text-xs text-ink2">
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="inline-block h-0.5 w-4 rounded"
            style={{ background: "var(--accent)" }}
          />
          Fondo
        </span>
        {hasBench && (
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="inline-block h-0.5 w-4 rounded"
              style={{ background: "var(--muted)" }}
            />
            S&P 500 (misma inversión)
          </span>
        )}
      </div>
      <div className="h-64 w-full sm:h-72">
        <ResponsiveContainer>
          <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 4 }}>
            <CartesianGrid stroke="var(--line)" strokeWidth={1} vertical={false} />
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
                border: "1px solid var(--line)",
                borderRadius: 8,
                color: "var(--ink)",
                fontSize: 12,
              }}
              labelFormatter={(l) => shortDate(String(l))}
              formatter={(value, name) => [
                money(Number(value)),
                name === "fondo" ? "Fondo" : "S&P 500",
              ]}
            />
            <Line
              type="monotone"
              dataKey="fondo"
              stroke="var(--accent)"
              strokeWidth={2}
              strokeLinecap="round"
              dot={false}
              activeDot={{ r: 4, stroke: "var(--surface)", strokeWidth: 2 }}
              isAnimationActive={false}
            />
            {hasBench && (
              <Line
                type="monotone"
                dataKey="sp500"
                stroke="var(--muted)"
                strokeWidth={2}
                strokeLinecap="round"
                dot={false}
                activeDot={{ r: 4, stroke: "var(--surface)", strokeWidth: 2 }}
                isAnimationActive={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
