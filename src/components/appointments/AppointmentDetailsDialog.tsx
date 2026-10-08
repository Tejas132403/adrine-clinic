"use client";

import Link from "next/link";
import { CalendarClock, CheckCircle2, FileHeart, XCircle } from "lucide-react";
import type { AppointmentItem } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { AppointmentStatusBadge, PatientStatusBadge } from "@/components/ui/Badge";
import { DetailItem } from "@/components/ui/Panel";
import { formatDate, formatTimeRange } from "@/utils/format";

export function AppointmentDetailsDialog({
  appointment,
  open,
  canManage,
  onClose,
  onReschedule,
  onCancel,
  onComplete,
  onAddNote,
}: {
  appointment: AppointmentItem | null;
  open: boolean;
  canManage: boolean;
  onClose: () => void;
  onReschedule?: (appointment: AppointmentItem) => void;
  onCancel?: (appointment: AppointmentItem) => void;
  onComplete?: (appointment: AppointmentItem) => void;
  onAddNote?: (appointment: AppointmentItem) => void;
}) {
  const { user, isDoctor } = useAuth();

  if (!appointment) return null;

  const isDoctorAppointment = isDoctor && appointment.doctor.id === user?.doctorId;
  const canComplete = (canManage || isDoctorAppointment) && appointment.status === "SCHEDULED";
  const canAddClinicalNote = isDoctorAppointment && appointment.status !== "CANCELLED";
  const canReschedule = canManage && appointment.status === "SCHEDULED";
  const canCancel = canManage && appointment.status === "SCHEDULED";
  const dismiss = () => onClose();

  return (
    <Modal
      open={open}
      onClose={dismiss}
      title="Appointment details"
      description={`${appointment.patient.firstName} ${appointment.patient.lastName} · ${formatDate(appointment.appointmentDate)}`}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={dismiss}>
            Close
          </Button>
          {canAddClinicalNote && onAddNote ? (
            <Button
              variant="secondary"
              icon={<FileHeart className="h-3.5 w-3.5 text-brand-600" />}
              onClick={() => {
                dismiss();
                onAddNote(appointment);
              }}
            >
              Add clinical note
            </Button>
          ) : null}
          {canReschedule && onReschedule ? (
            <Button
              variant="secondary"
              icon={<CalendarClock className="h-3.5 w-3.5" />}
              onClick={() => {
                dismiss();
                onReschedule(appointment);
              }}
            >
              Reschedule
            </Button>
          ) : null}
          {canComplete && onComplete ? (
            <Button
              icon={<CheckCircle2 className="h-3.5 w-3.5" />}
              onClick={() => {
                dismiss();
                onComplete(appointment);
              }}
            >
              Mark completed
            </Button>
          ) : null}
          {canCancel && onCancel ? (
            <Button
              variant="dangerGhost"
              icon={<XCircle className="h-3.5 w-3.5" />}
              onClick={() => {
                dismiss();
                onCancel(appointment);
              }}
            >
              Cancel visit
            </Button>
          ) : null}
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <AppointmentStatusBadge status={appointment.status} />
          {appointment.noteCount > 0 ? (
            <span className="text-xs text-ink-soft">
              {appointment.noteCount} clinical note{appointment.noteCount === 1 ? "" : "s"} recorded
            </span>
          ) : null}
        </div>

        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <DetailItem label="Date" value={formatDate(appointment.appointmentDate)} />
          <DetailItem
            label="Time"
            value={formatTimeRange(appointment.startTime, appointment.endTime)}
          />
          <DetailItem
            label="Patient"
            value={
              <span className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/patients/${appointment.patient.id}`}
                  className="font-medium text-brand-700 hover:underline"
                >
                  {appointment.patient.firstName} {appointment.patient.lastName}
                </Link>
                <PatientStatusBadge status={appointment.patient.status} />
              </span>
            }
          />
          <DetailItem label="Contact" value={appointment.patient.phone} />
          <DetailItem
            label="Doctor"
            value={
              <span>
                {appointment.doctor.name}
                <span className="block text-xs text-ink-soft">{appointment.doctor.specialization}</span>
              </span>
            }
          />
          <DetailItem label="Reason for visit" value={appointment.reason} />
        </dl>
      </div>
    </Modal>
  );
}
