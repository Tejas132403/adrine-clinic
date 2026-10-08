"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PaginationMeta } from "@/types";
import { Button } from "./Button";

export function Pagination({
  meta,
  onPageChange,
  disabled = false,
}: {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}) {
  const first = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1;
  const last = Math.min(meta.page * meta.limit, meta.total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 sm:px-5">
      <p className="text-xs text-ink-soft">
        Showing <span className="font-medium text-ink-muted tabular-nums">{first}</span>–
        <span className="font-medium text-ink-muted tabular-nums">{last}</span> of{" "}
        <span className="font-medium text-ink-muted tabular-nums">{meta.total}</span>
      </p>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          disabled={disabled || meta.page <= 1}
          onClick={() => onPageChange(meta.page - 1)}
          icon={<ChevronLeft className="h-3.5 w-3.5" />}
        >
          Previous
        </Button>
        <span className="text-xs text-ink-soft tabular-nums">
          Page {meta.page} of {meta.totalPages}
        </span>
        <Button
          size="sm"
          variant="secondary"
          disabled={disabled || meta.page >= meta.totalPages}
          onClick={() => onPageChange(meta.page + 1)}
        >
          Next
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
