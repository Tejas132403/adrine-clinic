"use client";

import { Search, X } from "lucide-react";
import { Select } from "@/components/ui/Field";
import { PATIENT_STATUSES, type PatientStatus } from "@/types";
import { formatPatientStatus } from "@/utils/format";
import type { PatientListParams } from "@/services/clinic.service";

export type PatientSortOption = "createdAt:desc" | "createdAt:asc" | "lastName:asc" | "lastName:desc";

export const SORT_OPTIONS: Array<{ value: PatientSortOption; label: string }> = [
  { value: "createdAt:desc", label: "Newest first" },
  { value: "createdAt:asc", label: "Oldest first" },
  { value: "lastName:asc", label: "Name A → Z" },
  { value: "lastName:desc", label: "Name Z → A" },
];

export function PatientFilters({
  search,
  status,
  sort,
  resultCount,
  loading,
  onSearchChange,
  onStatusChange,
  onSortChange,
  onReset,
}: {
  search: string;
  status: PatientStatus | "ALL";
  sort: PatientSortOption;
  resultCount: number;
  loading: boolean;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: PatientStatus | "ALL") => void;
  onSortChange: (value: PatientSortOption) => void;
  onReset: () => void;
}) {
  const filtersActive = search.trim().length > 0 || status !== "ALL" || sort !== "createdAt:desc";

  return (
    <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3.5 sm:px-5 lg:flex-row lg:items-center">
      <div className="relative flex-1 lg:max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" aria-hidden />
        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search name, phone or email"
          aria-label="Search patients"
          className="h-9 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm text-ink placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          aria-label="Filter by patient status"
          value={status}
          onChange={(event) => onStatusChange(event.target.value as PatientStatus | "ALL")}
          className="w-[9.5rem]"
        >
          <option value="ALL">All statuses</option>
          {PATIENT_STATUSES.map((value) => (
            <option key={value} value={value}>
              {formatPatientStatus(value)}
            </option>
          ))}
        </Select>

        <Select
          aria-label="Sort patients"
          value={sort}
          onChange={(event) => onSortChange(event.target.value as PatientSortOption)}
          className="w-[10.5rem]"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>

        {filtersActive ? (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium text-slate-600 transition hover:bg-slate-100 hover:text-ink"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
            Clear
          </button>
        ) : null}
      </div>

      <p className="text-xs text-ink-soft lg:ml-auto" aria-live="polite">
        {loading ? "Loading…" : `${resultCount} patient${resultCount === 1 ? "" : "s"}`}
      </p>
    </div>
  );
}

export function toListParams(
  page: number,
  limit: number,
  search: string,
  status: PatientStatus | "ALL",
  sort: PatientSortOption,
): PatientListParams {
  const [sortBy, sortOrder] = sort.split(":") as [PatientListParams["sortBy"], "asc" | "desc"];
  return {
    page,
    limit,
    search: search.trim() || undefined,
    status,
    sortBy,
    sortOrder,
  };
}
