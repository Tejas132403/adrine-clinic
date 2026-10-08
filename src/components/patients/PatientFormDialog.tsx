"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FieldError, Input, Select, Textarea, controlClasses } from "@/components/ui/Field";
import { useToast } from "@/context/ToastContext";
import { patientService } from "@/services/clinic.service";
import { applyApiFieldErrors, messageOf } from "@/utils/apiErrors";
import { patientFormSchema, type PatientFormValues } from "@/utils/formSchemas";
import { GENDERS, PATIENT_STATUSES, type PatientListItem } from "@/types";
import { formatGender, formatPatientStatus } from "@/utils/format";
import { ageFromDateOfBirth } from "@/utils/date";

export type EditablePatient = Pick<
  PatientListItem,
  "id" | "firstName" | "lastName" | "dateOfBirth" | "gender" | "phone" | "email" | "address" | "status"
>;

const EMPTY_VALUES: PatientFormValues = {
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  gender: "FEMALE",
  phone: "",
  email: "",
  address: "",
  status: "ACTIVE",
};

const FORM_FIELDS = [
  "firstName",
  "lastName",
  "dateOfBirth",
  "gender",
  "phone",
  "email",
  "address",
  "status",
] as const;

export function PatientFormDialog({
  open,
  patient,
  onClose,
  onSaved,
}: {
  open: boolean;
  patient: EditablePatient | null;
  onClose: () => void;
  onSaved: (patient: PatientListItem, mode: "created" | "updated") => void;
}) {
  const toast = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const isEdit = Boolean(patient);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PatientFormValues>({
    resolver: zodResolver(patientFormSchema),
    defaultValues: EMPTY_VALUES,
  });

  const watchDob = watch("dateOfBirth");
  const calculatedAge = watchDob ? ageFromDateOfBirth(watchDob) : null;

  useEffect(() => {
    if (!open) return;
    setFormError(null);
    reset(
      patient
        ? {
            firstName: patient.firstName,
            lastName: patient.lastName,
            dateOfBirth: patient.dateOfBirth,
            gender: patient.gender,
            phone: patient.phone,
            email: patient.email ?? "",
            address: patient.address ?? "",
            status: patient.status,
          }
        : EMPTY_VALUES,
    );
  }, [open, patient, reset]);

  const onSubmit = async (values: PatientFormValues) => {
    setFormError(null);
    const payload = {
      ...values,
      email: values.email === "" ? null : values.email,
      address: values.address === "" ? null : values.address,
    };

    try {
      const saved = patient
        ? await patientService.update(patient.id, payload)
        : await patientService.create(payload);

      toast.success(
        patient
          ? `${saved.firstName} ${saved.lastName} updated`
          : `${saved.firstName} ${saved.lastName} registered`,
        patient ? "The patient record has been saved." : "The patient can now be booked for appointments.",
      );
      onSaved(saved, patient ? "updated" : "created");
      onClose();
    } catch (error) {
      applyApiFieldErrors(error, setError, FORM_FIELDS);
      setFormError(messageOf(error, "Unable to save this patient right now. Please try again."));
    }
  };

  return (
    <Modal
      open={open}
      onClose={isSubmitting ? () => undefined : onClose}
      title={isEdit ? "Edit patient" : "Register patient"}
      description={
        isEdit
          ? "Update demographic and contact details. Status controls booking eligibility."
          : "Only name, date of birth, gender and phone number are required."
      }
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="patient-form" loading={isSubmitting}>
            {isEdit ? "Save changes" : "Register patient"}
          </Button>
        </>
      }
    >
      <form id="patient-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
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
          <Input
            label="First name"
            required
            autoComplete="off"
            error={errors.firstName?.message}
            {...register("firstName")}
          />
          <Input
            label="Last name"
            required
            autoComplete="off"
            error={errors.lastName?.message}
            {...register("lastName")}
          />

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="dob-input" className="label-field">
                Date of birth <span className="ml-0.5 text-rose-500">*</span>
              </label>
              {calculatedAge !== null && calculatedAge >= 0 ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700 border border-brand-200">
                  Age: {calculatedAge} {calculatedAge === 1 ? "yr" : "yrs"}
                </span>
              ) : null}
            </div>
            <input
              id="dob-input"
              type="date"
              required
              max={new Date().toISOString().slice(0, 10)}
              {...register("dateOfBirth")}
              className={controlClasses(errors.dateOfBirth?.message)}
            />
            {errors.dateOfBirth ? (
              <FieldError message={errors.dateOfBirth.message} />
            ) : calculatedAge !== null && calculatedAge >= 0 ? (
              <p className="text-xs text-ink-soft">
                Calculated age: <strong className="font-semibold text-ink">{calculatedAge} {calculatedAge === 1 ? "year" : "years"} old</strong>
              </p>
            ) : (
              <p className="text-xs text-ink-soft">Select birth date to automatically calculate patient age</p>
            )}
          </div>

          <Select label="Gender" required error={errors.gender?.message} {...register("gender")}>
            {GENDERS.map((gender) => (
              <option key={gender} value={gender}>
                {formatGender(gender)}
              </option>
            ))}
          </Select>
          <Input
            label="Phone"
            type="tel"
            required
            placeholder="+91 98765 43210"
            hint="Used to spot duplicate registrations"
            error={errors.phone?.message}
            {...register("phone")}
          />
          <Input
            label="Email"
            type="email"
            placeholder="patient@example.com"
            error={errors.email?.message}
            {...register("email")}
          />
          <Textarea
            label="Address"
            rows={2}
            className="min-h-[4.5rem]"
            placeholder="Street, area, city"
            error={errors.address?.message}
            {...register("address")}
          />
          <Select
            label="Status"
            error={errors.status?.message}
            {...register("status")}
          >
            {PATIENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {formatPatientStatus(status)}
              </option>
            ))}
          </Select>
        </div>
      </form>
    </Modal>
  );
}
