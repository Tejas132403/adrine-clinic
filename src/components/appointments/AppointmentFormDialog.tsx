"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, CalendarClock, Info } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { useToast } from "@/context/ToastContext";
import { appointmentService, doctorService, patientService } from "@/services/clinic.service";
import { useApiResource, useDebouncedValue } from "@/hooks/useApiResource";
import { applyApiFieldErrors, messageOf } from "@/utils/apiErrors";
import { appointmentFormSchema, type AppointmentFormValues } from "@/utils/formSchemas";
import { CLINIC_HOURS_LABEL } from "@/utils/clinic";
import type { AppointmentItem, DoctorSummary, PatientListItem } from "@/types";
import { formatTime, formatTimeRange, todayIsoDate } from "@/utils/format";
import { timeRangesOverlap } from "@/utils/date";

const FORM_FIELDS = ["patientId", "doctorId", "appointmentDate", "startTime", "endTime", "reason"] as const;

export function AppointmentFormDialog({
  open,
  mode,
  appointment,
  defaultPatientId,
  onClose,
  onSaved,
}: {
  open: boolean;
  mode: "create" | "reschedule";
  appointment?: AppointmentItem | null;
  defaultPatientId?: string | null;
  onClose: () => void;
  onSaved: (appointment: AppointmentItem, mode: "create" | "reschedule") => void;
}) {
  const toast = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const isReschedule = mode === "reschedule";

  const { data: patientPage } = useApiResource(
    () => patientService.list({ limit: 100, sortBy: "firstName", sortOrder: "asc", status: "ALL" }),
    [open],
  );
  const { data: doctors } = useApiResource(() => doctorService.list(), [open]);

  const patients: PatientListItem[] = useMemo(() => {
    const list = (patientPage?.items ?? []).filter((patient) => patient.status !== "ARCHIVED");
    // Keep the appointment's own patient selectable even if it is archived.
    if (appointment && !list.some((patient) => patient.id === appointment.patient.id)) {
      const archived = patientPage?.items.find((patient) => patient.id === appointment.patient.id);
      if (archived) list.unshift(archived);
    }
    return list;
  }, [patientPage, appointment]);

  const doctorOptions: DoctorSummary[] = doctors ?? [];

  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      patientId: "",
      doctorId: "",
      appointmentDate: todayIsoDate(),
      startTime: "09:00",
      endTime: "09:30",
      reason: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    setFormError(null);
    reset({
      patientId: appointment?.patient.id ?? defaultPatientId ?? "",
      doctorId: appointment?.doctor.id ?? "",
      appointmentDate: appointment?.appointmentDate ?? todayIsoDate(),
      startTime: appointment?.startTime ?? "09:00",
      endTime: appointment?.endTime ?? "09:30",
      reason: appointment?.reason ?? "",
    });
  }, [open, appointment, defaultPatientId, reset]);

  const [doctorId, appointmentDate, startTime, endTime] = watch([
    "doctorId",
    "appointmentDate",
    "startTime",
    "endTime",
  ]);

  const debouncedDate = useDebouncedValue(appointmentDate, 300);

  // Live view of the doctor's day, so conflicts are visible before submitting.
  const { data: bookedSlots } = useApiResource(
    () =>
      doctorId && debouncedDate
        ? appointmentService.availability({
            doctorId,
            date: debouncedDate,
            excludeAppointmentId: appointment?.id,
          })
        : Promise.resolve([]),
    [doctorId, debouncedDate, appointment?.id, open],
  );

  const slots = bookedSlots ?? [];
  const overlapping = useMemo(() => {
    if (!startTime || !endTime || startTime >= endTime) return null;
    return (
      slots.find((slot) => timeRangesOverlap(startTime, endTime, slot.startTime, slot.endTime)) ?? null
    );
  }, [slots, startTime, endTime]);

  const onSubmit = async (values: AppointmentFormValues) => {
    setFormError(null);
    const payload = {
      ...values,
      startTime: values.startTime.slice(0, 5),
      endTime: values.endTime.slice(0, 5),
      reason: values.reason.trim(),
    };

    try {
      const saved =
        isReschedule && appointment
          ? await appointmentService.reschedule(appointment.id, payload)
          : await appointmentService.create(payload);

      toast.success(
        isReschedule && appointment ? "Appointment rescheduled" : "Appointment booked",
        `${saved.patient.firstName} ${saved.patient.lastName} · ${saved.appointmentDate} · ${formatTimeRange(saved.startTime, saved.endTime)}`,
      );
      onSaved(saved, isReschedule ? "reschedule" : "create");
      onClose();
    } catch (error) {
      applyApiFieldErrors(error, setError, FORM_FIELDS);
      setFormError(messageOf(error, "Unable to save this appointment right now. Please try again."));
    }
  };

  return (
    <Modal
      open={open}
      onClose={isSubmitting ? () => undefined : onClose}
      title={isReschedule ? "Reschedule appointment" : "New appointment"}
      description={
        isReschedule && appointment
          ? `Currently ${appointment.appointmentDate} · ${formatTimeRange(appointment.startTime, appointment.endTime)}`
          : "Book a visit for a registered patient. Conflicts are checked before saving."
      }
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="appointment-form" loading={isSubmitting}>
            {isReschedule ? "Save changes" : "Book appointment"}
          </Button>
        </>
      }
    >
      <form id="appointment-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {formError ? (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5 text-[13px] text-rose-700"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{formError}</span>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Patient"
            required
            className="sm:col-span-2"
            error={errors.patientId?.message}
            {...register("patientId")}
          >
            <option value="">Select a patient…</option>
            {patients.map((patient) => (
              <option key={patient.id} value={patient.id}>
                {patient.firstName} {patient.lastName} · {patient.phone}
              </option>
            ))}
          </Select>

          <Select label="Doctor" required error={errors.doctorId?.message} {...register("doctorId")}>
            <option value="">Select a doctor…</option>
            {doctorOptions.map((doctor) => (
              <option key={doctor.id} value={doctor.id}>
                {doctor.name} · {doctor.specialization}
              </option>
            ))}
          </Select>

          <Input
            label="Date"
            type="date"
            required
            min={todayIsoDate()}
            error={errors.appointmentDate?.message}
            {...register("appointmentDate")}
          />

          <Input
            label="Start time"
            type="time"
            required
            step={300}
            error={errors.startTime?.message}
            {...register("startTime")}
          />
          <Input
            label="End time"
            type="time"
            required
            step={300}
            hint={`Clinic hours: ${CLINIC_HOURS_LABEL}`}
            error={errors.endTime?.message}
            {...register("endTime")}
          />

          <Textarea
            label="Reason for visit"
            required
            className="sm:col-span-2 min-h-[4.5rem]"
            placeholder="e.g. Fever and sore throat, follow-up for diabetes"
            error={errors.reason?.message}
            {...register("reason")}
          />
        </div>

        {doctorId && debouncedDate ? (
          <div className="rounded-md border border-slate-200 bg-surface-subtle p-3">
            <p className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wider text-ink-soft">
              <CalendarClock className="h-3.5 w-3.5" aria-hidden />
              Already booked on this day
            </p>

            {slots.length === 0 ? (
              <p className="mt-2 text-[13px] text-ink-muted">
                The doctor has no other appointments on this date.
              </p>
            ) : (
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {slots.map((slot) => (
                  <li
                    key={slot.id}
                    className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-ink-muted"
                  >
                    {formatTimeRange(slot.startTime, slot.endTime)}
                    <span className="text-ink-soft"> · {slot.patientName}</span>
                  </li>
                ))}
              </ul>
            )}

            {overlapping ? (
              <p className="mt-2.5 flex items-start gap-1.5 text-[13px] font-medium text-rose-700">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                This doctor is unavailable from {formatTime(overlapping.startTime)} to{" "}
                {formatTime(overlapping.endTime)}.
              </p>
            ) : (
              <p className="mt-2.5 flex items-start gap-1.5 text-[13px] text-ink-soft">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                The selected time is free.
              </p>
            )}
          </div>
        ) : null}
      </form>
    </Modal>
  );
}
