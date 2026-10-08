"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  CalendarClock,
  Check,
  Info,
  Pencil,
  Search,
  UserPlus,
  X,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { Avatar } from "@/components/ui/Avatar";
import { PatientStatusBadge } from "@/components/ui/Badge";
import { PatientFormDialog } from "@/components/patients/PatientFormDialog";
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

  const [patientSearch, setPatientSearch] = useState("");
  const [newPatientModalOpen, setNewPatientModalOpen] = useState(false);
  const [extraPatients, setExtraPatients] = useState<PatientListItem[]>([]);

  const { data: patientPage } = useApiResource(
    () => patientService.list({ limit: 100, sortBy: "firstName", sortOrder: "asc", status: "ALL" }),
    [open],
  );
  const { data: doctors } = useApiResource(() => doctorService.list(), [open]);

  const allPatients: PatientListItem[] = useMemo(() => {
    const combined = [...extraPatients, ...(patientPage?.items ?? [])];
    const map = new Map<string, PatientListItem>();
    for (const patient of combined) {
      if (!map.has(patient.id) && patient.status !== "ARCHIVED") {
        map.set(patient.id, patient);
      }
    }
    // Keep the appointment's own patient selectable even if archived
    if (appointment) {
      const existing = combined.find((p) => p.id === appointment.patient.id);
      if (existing && !map.has(existing.id)) map.set(existing.id, existing);
    }
    return Array.from(map.values());
  }, [extraPatients, patientPage, appointment]);

  const doctorOptions: DoctorSummary[] = doctors ?? [];

  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    setValue,
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

  const selectedPatientId = watch("patientId");
  const selectedPatient = useMemo(
    () => allPatients.find((p) => p.id === selectedPatientId),
    [allPatients, selectedPatientId],
  );

  const filteredPatients = useMemo(() => {
    const q = patientSearch.trim().toLowerCase();
    if (!q) return allPatients.slice(0, 10);
    return allPatients
      .filter(
        (p) =>
          `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
          p.phone.toLowerCase().includes(q) ||
          (p.email && p.email.toLowerCase().includes(q)),
      )
      .slice(0, 10);
  }, [allPatients, patientSearch]);

  useEffect(() => {
    if (!open) return;
    setFormError(null);
    setPatientSearch("");
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

  const handlePatientCreated = (newPatient: PatientListItem) => {
    setExtraPatients((prev) => [newPatient, ...prev]);
    setValue("patientId", newPatient.id, { shouldValidate: true });
    setPatientSearch("");
    setNewPatientModalOpen(false);
    toast.success("Patient registered", `${newPatient.firstName} ${newPatient.lastName} selected for appointment.`);
  };

  const onSubmit = async (values: AppointmentFormValues) => {
    setFormError(null);
    try {
      const saved = isReschedule
        ? await appointmentService.reschedule(appointment!.id, values)
        : await appointmentService.create(values);

      onSaved(saved, mode);
      onClose();
    } catch (caught) {
      applyApiFieldErrors(caught, setError, FORM_FIELDS);
      setFormError(messageOf(caught, "Unable to save this appointment. Please check the details."));
    }
  };

  return (
    <>
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

          {/* Hidden input to keep react-hook-form wired */}
          <input type="hidden" {...register("patientId")} />

          {/* Searchable Patient Picker */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[13px] font-medium text-ink">
                Patient <span className="text-rose-600">*</span>
              </label>
              {!isReschedule ? (
                <button
                  type="button"
                  onClick={() => setNewPatientModalOpen(true)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-900"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  + Register new patient
                </button>
              ) : null}
            </div>

            {selectedPatient ? (
              <div className="flex items-center justify-between rounded-lg border border-brand-200 bg-brand-50/50 p-3">
                <div className="flex items-center gap-3">
                  <Avatar name={`${selectedPatient.firstName} ${selectedPatient.lastName}`} size="md" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-ink text-sm">
                        {selectedPatient.firstName} {selectedPatient.lastName}
                      </span>
                      <PatientStatusBadge status={selectedPatient.status} />
                    </div>
                    <div className="mt-0.5 text-xs text-ink-muted">
                      <span>{selectedPatient.phone}</span>
                      {selectedPatient.email ? <span> · {selectedPatient.email}</span> : null}
                    </div>
                  </div>
                </div>
                {!isReschedule ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    icon={<Pencil className="h-3 w-3" />}
                    onClick={() => {
                      setValue("patientId", "", { shouldValidate: true });
                      setPatientSearch("");
                    }}
                  >
                    Change patient
                  </Button>
                ) : null}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
                  <input
                    type="text"
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    placeholder="Search patient by name, phone or email…"
                    className="h-10 w-full rounded-md border border-slate-300 bg-white pl-9 pr-8 text-sm text-ink placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
                  />
                  {patientSearch ? (
                    <button
                      type="button"
                      onClick={() => setPatientSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>

                <div className="max-h-48 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-sm divide-y divide-slate-100">
                  {filteredPatients.length > 0 ? (
                    filteredPatients.map((patient) => (
                      <button
                        key={patient.id}
                        type="button"
                        onClick={() => {
                          setValue("patientId", patient.id, { shouldValidate: true });
                          setPatientSearch("");
                        }}
                        className="flex w-full items-center justify-between px-3 py-2.5 text-left transition-colors hover:bg-slate-50"
                      >
                        <div className="flex items-center gap-2.5">
                          <Avatar name={`${patient.firstName} ${patient.lastName}`} size="sm" />
                          <div>
                            <span className="block font-medium text-ink text-sm">
                              {patient.firstName} {patient.lastName}
                            </span>
                            <span className="block text-xs text-ink-muted">
                              {patient.phone} {patient.email ? `· ${patient.email}` : ""}
                            </span>
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-brand-700">Select</span>
                      </button>
                    ))
                  ) : (
                    <div className="p-4 text-center">
                      <p className="text-xs text-ink-muted">
                        No patients found matching &ldquo;{patientSearch}&rdquo;
                      </p>
                      <button
                        type="button"
                        onClick={() => setNewPatientModalOpen(true)}
                        className="mt-2.5 inline-flex items-center gap-1 rounded-md border border-brand-300 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        Register as new patient
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {errors.patientId?.message ? (
              <p className="text-xs font-medium text-rose-600">{errors.patientId.message}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

      {/* Quick Register New Patient Modal */}
      <PatientFormDialog
        open={newPatientModalOpen}
        patient={null}
        onClose={() => setNewPatientModalOpen(false)}
        onSaved={handlePatientCreated}
      />
    </>
  );
}
