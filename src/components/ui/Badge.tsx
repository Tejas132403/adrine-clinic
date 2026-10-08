import { cn } from "@/utils/cn";
import type { AppointmentStatus, PatientStatus } from "@/types";
import { formatAppointmentStatus, formatPatientStatus } from "@/utils/format";

type Tone = "neutral" | "brand" | "success" | "warning" | "danger" | "info";

const TONES: Record<Tone, string> = {
  neutral: "border-slate-200 bg-slate-50 text-slate-600",
  brand: "border-brand-200 bg-brand-50 text-brand-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  danger: "border-rose-200 bg-rose-50 text-rose-700",
  info: "border-blue-200 bg-blue-50 text-blue-700",
};

const DOTS: Record<Tone, string> = {
  neutral: "bg-slate-400",
  brand: "bg-brand-500",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-rose-500",
  info: "bg-blue-500",
};

export function Badge({
  tone = "neutral",
  dot = false,
  className,
  children,
}: {
  tone?: Tone;
  dot?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium",
        TONES[tone],
        className,
      )}
    >
      {dot ? <span className={cn("h-1.5 w-1.5 rounded-full", DOTS[tone])} aria-hidden /> : null}
      {children}
    </span>
  );
}

const APPOINTMENT_TONES: Record<AppointmentStatus, Tone> = {
  SCHEDULED: "info",
  COMPLETED: "success",
  CANCELLED: "danger",
};

export function AppointmentStatusBadge({ status }: { status: AppointmentStatus }) {
  return (
    <Badge tone={APPOINTMENT_TONES[status]} dot>
      {formatAppointmentStatus(status)}
    </Badge>
  );
}

const PATIENT_TONES: Record<PatientStatus, Tone> = {
  ACTIVE: "success",
  INACTIVE: "warning",
  ARCHIVED: "neutral",
};

export function PatientStatusBadge({ status }: { status: PatientStatus }) {
  return (
    <Badge tone={PATIENT_TONES[status]} dot>
      {formatPatientStatus(status)}
    </Badge>
  );
}
