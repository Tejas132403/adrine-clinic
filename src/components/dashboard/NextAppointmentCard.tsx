import Link from "next/link";
import { ArrowRight, CalendarClock } from "lucide-react";
import type { AppointmentItem } from "@/types";
import { formatDateShort, formatTimeRange } from "@/utils/format";
import { Avatar } from "@/components/ui/Avatar";

/** "What is happening next?" - the question front-desk staff ask most often. */
export function NextAppointmentCard({ appointment }: { appointment: AppointmentItem | null }) {
  if (!appointment) {
    return (
      <div className="px-4 py-5 sm:px-5">
        <p className="text-xs text-ink-soft">
          Nothing left on the schedule. The next booked visit will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 sm:px-5">
      <div className="flex items-center gap-3">
        <Avatar name={`${appointment.patient.firstName} ${appointment.patient.lastName}`} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink">
            {appointment.patient.firstName} {appointment.patient.lastName}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-soft">
            <CalendarClock className="h-3.5 w-3.5" aria-hidden />
            {formatDateShort(appointment.appointmentDate)} · {formatTimeRange(appointment.startTime, appointment.endTime)}
          </p>
        </div>
      </div>

      <dl className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-xs">
        <div className="flex gap-2">
          <dt className="w-20 shrink-0 text-ink-soft">Doctor</dt>
          <dd className="min-w-0 text-ink-muted">{appointment.doctor.name}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-20 shrink-0 text-ink-soft">Reason</dt>
          <dd className="min-w-0 text-ink-muted">{appointment.reason}</dd>
        </div>
      </dl>

      <Link
        href={`/patients/${appointment.patient.id}`}
        className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-brand-700 hover:text-brand-800"
      >
        Open patient record
        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
      </Link>
    </div>
  );
}
