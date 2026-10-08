"use client";

import Link from "next/link";
import { CalendarClock, CheckCircle2, Eye, XCircle } from "lucide-react";
import type { AppointmentItem } from "@/types";
import { AppointmentStatusBadge } from "@/components/ui/Badge";
import { TableSkeleton } from "@/components/ui/States";
import { formatDateShort, formatTimeRange } from "@/utils/format";
import { cn } from "@/utils/cn";

type AppointmentTableProps = {
  appointments: AppointmentItem[];
  loading?: boolean;
  /** Dashboard variant: single day, fewer columns, view-only actions. */
  compact?: boolean;
  /** Reception-only management actions. */
  canManage?: boolean;
  busyId?: string | null;
  onView: (appointment: AppointmentItem) => void;
  onReschedule?: (appointment: AppointmentItem) => void;
  onCancel?: (appointment: AppointmentItem) => void;
  onComplete?: (appointment: AppointmentItem) => void;
  emptyState: React.ReactNode;
};

function RowAction({
  label,
  onClick,
  tone = "default",
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  tone?: "default" | "danger" | "success";
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-md p-1.5 transition-colors disabled:opacity-40",
        tone === "danger" && "text-slate-500 hover:bg-rose-50 hover:text-rose-600",
        tone === "success" && "text-slate-500 hover:bg-emerald-50 hover:text-emerald-600",
        tone === "default" && "text-slate-500 hover:bg-slate-100 hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

export function AppointmentTable({
  appointments,
  loading = false,
  compact = false,
  canManage = false,
  busyId = null,
  onView,
  onReschedule,
  onCancel,
  onComplete,
  emptyState,
}: AppointmentTableProps) {
  if (loading) return <TableSkeleton rows={5} columns={compact ? 4 : 6} />;

  if (appointments.length === 0) return <>{emptyState}</>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead className="bg-surface-subtle">
          <tr>
            <th scope="col" className="table-head-cell pl-4 sm:pl-5">
              Time
            </th>
            <th scope="col" className="table-head-cell">
              Patient
            </th>
            <th scope="col" className="table-head-cell">
              Doctor
            </th>
            {!compact ? (
              <th scope="col" className="table-head-cell hidden lg:table-cell">
                Reason
              </th>
            ) : null}
            <th scope="col" className="table-head-cell">
              Status
            </th>
            <th scope="col" className="table-head-cell pr-4 text-right sm:pr-5">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {appointments.map((appointment) => {
            const canAct = canManage && appointment.status === "SCHEDULED";
            return (
              <tr key={appointment.id} className="transition-colors hover:bg-surface-subtle">
                <td className="table-cell whitespace-nowrap pl-4 sm:pl-5">
                  <span className="block font-medium text-ink">
                    {formatTimeRange(appointment.startTime, appointment.endTime)}
                  </span>
                  {!compact ? (
                    <span className="mt-0.5 block text-xs text-ink-soft">
                      {formatDateShort(appointment.appointmentDate)}
                    </span>
                  ) : null}
                </td>
                <td className="table-cell">
                  <Link
                    href={`/patients/${appointment.patient.id}`}
                    className="block font-medium text-ink hover:text-brand-700 hover:underline"
                  >
                    {appointment.patient.firstName} {appointment.patient.lastName}
                  </Link>
                  <span className="mt-0.5 hidden text-xs text-ink-soft sm:block">
                    {appointment.patient.phone}
                  </span>
                </td>
                <td className="table-cell">
                  <span className="block">{appointment.doctor.name}</span>
                  <span className="mt-0.5 hidden text-xs text-ink-soft sm:block">
                    {appointment.doctor.specialization}
                  </span>
                </td>
                {!compact ? (
                  <td className="table-cell hidden max-w-[16rem] lg:table-cell">
                    <span className="line-clamp-1" title={appointment.reason}>
                      {appointment.reason}
                    </span>
                  </td>
                ) : null}
                <td className="table-cell">
                  <AppointmentStatusBadge status={appointment.status} />
                  {appointment.noteCount > 0 ? (
                    <span className="mt-1 block text-2xs text-ink-soft">
                      {appointment.noteCount} note{appointment.noteCount === 1 ? "" : "s"}
                    </span>
                  ) : null}
                </td>
                <td className="table-cell pr-4 sm:pr-5">
                  <div className="flex items-center justify-end gap-0.5">
                    <RowAction label="View details" onClick={() => onView(appointment)}>
                      <Eye className="h-4 w-4" />
                    </RowAction>
                    {canAct && onComplete ? (
                      <RowAction
                        label="Mark as completed"
                        tone="success"
                        disabled={busyId === appointment.id}
                        onClick={() => onComplete(appointment)}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </RowAction>
                    ) : null}
                    {canAct && onReschedule ? (
                      <RowAction
                        label="Reschedule"
                        disabled={busyId === appointment.id}
                        onClick={() => onReschedule(appointment)}
                      >
                        <CalendarClock className="h-4 w-4" />
                      </RowAction>
                    ) : null}
                    {canAct && onCancel ? (
                      <RowAction
                        label="Cancel appointment"
                        tone="danger"
                        disabled={busyId === appointment.id}
                        onClick={() => onCancel(appointment)}
                      >
                        <XCircle className="h-4 w-4" />
                      </RowAction>
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
