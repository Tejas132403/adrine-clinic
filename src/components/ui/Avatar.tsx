import { cn } from "@/utils/cn";
import { initialsOf } from "@/utils/format";

const SIZES = {
  sm: "h-8 w-8 text-2xs",
  md: "h-9 w-9 text-xs",
  lg: "h-14 w-14 text-base",
};

/** Initials block - avoids avatar image management for a clinic roster. */
export function Avatar({
  name,
  size = "md",
  tone = "brand",
  className,
}: {
  name: string;
  size?: keyof typeof SIZES;
  tone?: "brand" | "neutral";
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-semibold uppercase tracking-wide",
        tone === "brand" ? "bg-brand-50 text-brand-700" : "bg-slate-100 text-slate-600",
        SIZES[size],
        className,
      )}
    >
      {initialsOf(name)}
    </span>
  );
}
