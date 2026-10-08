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
import { ageFromDateOfBirth, dateOfBirthFromAge, formatDateLabel } from "@/utils/date";

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
  const [birthInputMode, setBirthInputMode] = useState<"age" | "dob">("age");
  const [ageInput, setAgeInput] = useState<string>("");
  const isEdit = Boolean(patient);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    clearErrors,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PatientFormValues>({
    resolver: zodResolver(patientFormSchema),
    defaultValues: EMPTY_VALUES,
  });

  const watchDob = watch("dateOfBirth");

  useEffect(() => {
    if (!open) return;
    setFormError(null);
    if (patient) {
      const calculatedAge = ageFromDateOfBirth(patient.dateOfBirth);
      setAgeInput(calculatedAge !== null ? String(calculatedAge) : "");
      reset({
        firstName: patient.firstName,
        lastName: patient.lastName,
        dateOfBirth: patient.dateOfBirth,
        gender: patient.gender,
        phone: patient.phone,
        email: patient.email ?? "",
        address: patient.address ?? "",
        status: patient.status,
      });
    } else {
      setAgeInput("");
      setBirthInputMode("age");
      reset(EMPTY_VALUES);
    }
  }, [open, patient, reset]);

  const handleAgeChange = (val: string) => {
    setAgeInput(val);
    if (!val.trim()) {
      setValue("dateOfBirth", "", { shouldValidate: true });
      return;
    }
    const n = parseInt(val, 10);
    if (Number.isNaN(n) || n < 0 || n > 125) {
      setError("dateOfBirth", { message: "Age must be between 0 and 125 years" });
      setValue("dateOfBirth", "", { shouldValidate: false });
    } else {
      clearErrors("dateOfBirth");
      setValue("dateOfBirth", dateOfBirthFromAge(n), { shouldValidate: true });
    }
  };

  const birthError = errors.dateOfBirth?.message
    ? birthInputMode === "age" && errors.dateOfBirth.message.toLowerCase().includes("date of birth")
      ? "Age is required"
      : errors.dateOfBirth.message
    : undefined;

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
          : "Only name, age, gender and phone number are required."
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

          {birthInputMode === "age" ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="patient-age-input" className="label-field">
                  Age (years) <span className="ml-0.5 text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setBirthInputMode("dob")}
                  className="text-xs font-medium text-brand-700 hover:text-brand-900 hover:underline"
                >
                  Enter exact DOB instead
                </button>
              </div>
              <div className="relative">
                <input
                  id="patient-age-input"
                  type="number"
                  min={0}
                  max={125}
                  placeholder="e.g. 28"
                  value={ageInput}
                  onChange={(e) => handleAgeChange(e.target.value)}
                  className={controlClasses(birthError)}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">
                  years
                </span>
              </div>
              {birthError ? (
                <FieldError message={birthError} />
              ) : watchDob ? (
                <p className="text-xs text-ink-soft">
                  Estimated DOB: <span className="font-medium text-ink">{formatDateLabel(watchDob)}</span>
                </p>
              ) : (
                <p className="text-xs text-ink-soft">Enter patient&apos;s age in years</p>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="patient-dob-input" className="label-field">
                  Date of birth <span className="ml-0.5 text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setBirthInputMode("age")}
                  className="text-xs font-medium text-brand-700 hover:text-brand-900 hover:underline"
                >
                  Enter age instead
                </button>
              </div>
              <input
                id="patient-dob-input"
                type="date"
                max={new Date().toISOString().slice(0, 10)}
                {...register("dateOfBirth", {
                  onChange: (e) => {
                    const val = e.target.value;
                    const calculatedAge = ageFromDateOfBirth(val);
                    if (calculatedAge !== null) {
                      setAgeInput(String(calculatedAge));
                    }
                  },
                })}
                className={controlClasses(birthError)}
              />
              {birthError ? (
                <FieldError message={birthError} />
              ) : watchDob && ageFromDateOfBirth(watchDob) !== null ? (
                <p className="text-xs text-ink-soft">
                  Calculated age: <span className="font-medium text-ink">{ageFromDateOfBirth(watchDob)} years</span>
                </p>
              ) : null}
            </div>
          )}

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
