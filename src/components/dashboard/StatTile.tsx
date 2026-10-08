import type { LucideIcon } from "lucide-react";
import { cn } from "@/utils/cn";
import { Skeleton } from "@/components/ui/States";

const TONES = {
  brand: "bg-brand-50 text-brand-700",
  neutral: "bg-slate-100 text-slate-600",
  success: "bg-emerald-50 text-emerald-600",
  danger: "bg-rose-50 text-rose-600",
  info: "bg-blue-50 text-blue-600",
} as const;

/** Operationally focused metric tile: label, number, and the context that matters. */
export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  tone = "neutral",
  loading = false,
}: {
  label: string;
  value: number | string;
  hint?: string;
  icon: LucideIcon;
  tone?: keyof typeof TONES;
  loading?: boolean;
}) {
  return (
    <div className="rounded-card border border-slate-200 bg-white p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <p className="text-2xs font-semibold uppercase tracking-wider text-ink-soft">{label}</p>
        <span className={cn("flex h-7 w-7 items-center justify-center rounded-md", TONES[tone])}>
          <Icon className="h-3.5 w-3.5" aria-hidden />
        </span>
      </div>
      {loading ? (
        <Skeleton className="mt-2.5 h-7 w-14" />
      ) : (
        <p className="mt-2 text-2xl font-semibold tabular-nums text-ink">{value}</p>
      )}
      <p className="mt-1 min-h-4 text-xs text-ink-soft">{hint ?? ""}</p>
    </div>
  );
}
