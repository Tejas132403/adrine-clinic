"use client";

import { CalendarDays, Eye } from "lucide-react";
import type { AppointmentItem } from "@/types";
import { AppointmentStatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { formatDate, formatTimeRange } from "@/utils/format";

/** Date-ordered visit history for one patient. */
export function AppointmentHistoryTable({
  appointments,
  loading,
  onView,
}: {
  appointments: AppointmentItem[];
  loading: boolean;
  onView: (appointment: AppointmentItem) => void;
}) {
  if (loading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-10 animate-pulse rounded bg-slate-200/60" />
        ))}
      </div>
    );
  }

  if (appointments.length === 0) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="No appointments yet"
        description="Visits booked for this patient will appear here."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead className="bg-surface-subtle">
          <tr>
            <th scope="col" className="table-head-cell pl-4 sm:pl-5">
              Date &amp; time
            </th>
            <th scope="col" className="table-head-cell">
              Doctor
            </th>
            <th scope="col" className="table-head-cell hidden md:table-cell">
              Reason
            </th>
            <th scope="col" className="table-head-cell">
              Status
            </th>
            <th scope="col" className="table-head-cell pr-4 text-right sm:pr-5">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {appointments.map((appointment) => (
            <tr key={appointment.id} className="transition-colors hover:bg-surface-subtle">
              <td className="table-cell pl-4 sm:pl-5">
                <span className="block font-medium text-ink">{formatDate(appointment.appointmentDate)}</span>
                <span className="mt-0.5 block text-xs text-ink-soft">
                  {formatTimeRange(appointment.startTime, appointment.endTime)}
                </span>
              </td>
              <td className="table-cell">
                <span className="block">{appointment.doctor.name}</span>
                <span className="mt-0.5 block text-xs text-ink-soft">{appointment.doctor.specialization}</span>
              </td>
              <td className="table-cell hidden max-w-[16rem] md:table-cell">
                <span className="line-clamp-2" title={appointment.reason}>
                  {appointment.reason}
                </span>
              </td>
              <td className="table-cell">
                <AppointmentStatusBadge status={appointment.status} />
              </td>
              <td className="table-cell pr-4 sm:pr-5">
                <div className="flex justify-end">
                  <button
                    type="button"
                    title="View appointment"
                    aria-label="View appointment"
                    onClick={() => onView(appointment)}
                    className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-ink"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
