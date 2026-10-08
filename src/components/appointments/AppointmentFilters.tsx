"use client";

import { Search, X } from "lucide-react";
import { Select } from "@/components/ui/Field";
import { APPOINTMENT_STATUSES, type AppointmentStatus, type DoctorSummary } from "@/types";
import { formatAppointmentStatus } from "@/utils/format";
import { addDays, toDateOnlyString, todayDateOnly } from "@/utils/date";
import { cn } from "@/utils/cn";

export const ALL_DATES = "ALL";
export const TODAY = "today";

export function AppointmentFilters({
  dateFilter,
  doctorFilter,
  statusFilter,
  search,
  doctors,
  showDoctorFilter,
  resultCount,
  loading,
  onDateChange,
  onDoctorChange,
  onStatusChange,
  onSearchChange,
  onReset,
}: {
  dateFilter: string;
  doctorFilter: string;
  statusFilter: AppointmentStatus | "ALL";
  search: string;
  doctors: DoctorSummary[];
  showDoctorFilter: boolean;
  resultCount: number;
  loading: boolean;
  onDateChange: (value: string) => void;
  onDoctorChange: (value: string) => void;
  onStatusChange: (value: AppointmentStatus | "ALL") => void;
  onSearchChange: (value: string) => void;
  onReset: () => void;
}) {
  const tomorrow = toDateOnlyString(addDays(todayDateOnly(), 1));
  const filtersActive =
    dateFilter !== TODAY || doctorFilter !== "ALL" || statusFilter !== "ALL" || search.trim() !== "";

  const quickDates = [
    { value: TODAY, label: "Today" },
    { value: tomorrow, label: "Tomorrow" },
    { value: ALL_DATES, label: "All dates" },
  ];

  return (
    <div className="space-y-3 border-b border-slate-200 px-4 py-3.5 sm:px-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1 lg:max-w-xs">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft"
            aria-hidden
          />
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search patient or reason"
            aria-label="Search appointments"
            className="h-9 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm text-ink placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {showDoctorFilter ? (
            <Select
              aria-label="Filter by doctor"
              value={doctorFilter}
              onChange={(event) => onDoctorChange(event.target.value)}
              className="w-[12rem]"
            >
              <option value="ALL">All doctors</option>
              {doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.name}
                </option>
              ))}
            </Select>
          ) : null}

          <Select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(event) => onStatusChange(event.target.value as AppointmentStatus | "ALL")}
            className="w-[9.5rem]"
          >
            <option value="ALL">All statuses</option>
            {APPOINTMENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {formatAppointmentStatus(status)}
              </option>
            ))}
          </Select>

          <input
            type="date"
            aria-label="Filter by date"
            value={dateFilter === TODAY || dateFilter === ALL_DATES ? "" : dateFilter}
            onChange={(event) => onDateChange(event.target.value || ALL_DATES)}
            className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm text-ink focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
          />

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
          {loading ? "Loading…" : `${resultCount} appointment${resultCount === 1 ? "" : "s"}`}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {quickDates.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onDateChange(option.value)}
            className={cn(
              "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
              dateFilter === option.value
                ? "border-brand-200 bg-brand-50 text-brand-700"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
