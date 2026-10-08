"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Select, Textarea } from "@/components/ui/Field";
import { useToast } from "@/context/ToastContext";
import { patientService } from "@/services/clinic.service";
import { applyApiFieldErrors, messageOf } from "@/utils/apiErrors";
import { clinicalNoteFormSchema, type ClinicalNoteFormValues } from "@/utils/formSchemas";
import type { AppointmentItem, NoteItem } from "@/types";
import { formatDate, formatTimeRange } from "@/utils/format";

const FORM_FIELDS = ["appointmentId", "note"] as const;

/**
 * A note is always attached to a visit, so the doctor picks which appointment
 * the note belongs to. Only the doctor's own, non-cancelled visits are offered.
 */
export function ClinicalNoteDialog({
  open,
  patientId,
  patientName,
  appointments,
  onClose,
  onSaved,
}: {
  open: boolean;
  patientId: string;
  patientName: string;
  appointments: AppointmentItem[];
  onClose: () => void;
  onSaved: (note: NoteItem) => void;
}) {
  const toast = useToast();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ClinicalNoteFormValues>({
    resolver: zodResolver(clinicalNoteFormSchema),
    defaultValues: { appointmentId: appointments[0]?.id ?? "", note: "" },
  });

  useEffect(() => {
    if (!open) return;
    setFormError(null);
    reset({ appointmentId: appointments[0]?.id ?? "", note: "" });
  }, [open, appointments, reset]);

  const onSubmit = async (values: ClinicalNoteFormValues) => {
    setFormError(null);
    try {
      const note = await patientService.addNote(patientId, {
        appointmentId: values.appointmentId,
        note: values.note,
      });
      toast.success("Clinical note saved", "The note is attached to the selected visit.");
      onSaved(note);
      onClose();
    } catch (error) {
      applyApiFieldErrors(error, setError, FORM_FIELDS);
      setFormError(messageOf(error, "Unable to save this note right now. Please try again."));
    }
  };

  return (
    <Modal
      open={open}
      onClose={isSubmitting ? () => undefined : onClose}
      title="Add clinical note"
      description={`Recording a note for ${patientName}`}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="note-form" loading={isSubmitting}>
            Save note
          </Button>
        </>
      }
    >
      <form id="note-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {formError ? (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5 text-[13px] text-rose-700"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{formError}</span>
          </div>
        ) : null}

        <Select label="Visit" required error={errors.appointmentId?.message} {...register("appointmentId")}>
          {appointments.map((appointment) => (
            <option key={appointment.id} value={appointment.id}>
              {formatDate(appointment.appointmentDate)} ·{" "}
              {formatTimeRange(appointment.startTime, appointment.endTime)} · {appointment.reason}
            </option>
          ))}
        </Select>

        <Textarea
          label="Clinical note"
          required
          rows={6}
          className="min-h-[9rem]"
          placeholder="Examination findings, diagnosis, medication and follow-up advice…"
          error={errors.note?.message}
          {...register("note")}
        />
      </form>
    </Modal>
  );
}
