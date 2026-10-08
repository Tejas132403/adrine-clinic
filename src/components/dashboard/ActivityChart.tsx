"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DashboardActivityPoint } from "@/types";

const LEGEND = [
  { key: "completed", label: "Completed", className: "bg-brand-600" },
  { key: "scheduled", label: "Scheduled", className: "bg-slate-400" },
  { key: "cancelled", label: "Cancelled", className: "bg-rose-400" },
] as const;

/** Appointment volume for the last seven days, split by status. */
export function ActivityChart({ data }: { data: DashboardActivityPoint[] }) {
  return (
    <div>
      <div className="h-[13.5rem] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -20 }} barSize={22}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "#64748b" }}
              interval={0}
            />
            <YAxis
              allowDecimals={false}
              width={40}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "#64748b" }}
            />
            <Tooltip
              cursor={{ fill: "rgba(148, 163, 184, 0.12)" }}
              contentStyle={{
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                boxShadow: "0 10px 30px -12px rgb(15 23 42 / 0.25)",
                fontSize: 12,
                padding: "8px 10px",
              }}
              labelStyle={{ fontWeight: 600, color: "#0f172a", marginBottom: 2 }}
              itemStyle={{ padding: 0 }}
            />
            <Bar dataKey="completed" name="Completed" stackId="activity" fill="#0e7c75" />
            <Bar dataKey="scheduled" name="Scheduled" stackId="activity" fill="#94a3b8" />
            <Bar dataKey="cancelled" name="Cancelled" stackId="activity" fill="#fb7185" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <ul className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        {LEGEND.map((item) => (
          <li key={item.key} className="flex items-center gap-1.5 text-xs text-ink-muted">
            <span className={`h-2 w-2 rounded-sm ${item.className}`} aria-hidden />
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
