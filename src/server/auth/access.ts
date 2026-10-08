import { Prisma } from "@prisma/client";
import type { AuthUser, Role } from "@/types";
import { AppError } from "@/server/http";
import { prisma } from "@/server/db";

/* ---------------------------------------------------------------------------
 * LIVE ENGINEERING REQUIREMENT
 * ---------------------------------------------------------------------------
 * "A doctor may only view patients who have an appointment with that doctor."
 *
 * The rule lives in exactly this file. Every patient read (list, profile,
 * appointment history, notes) goes through `patientWhere()` /
 * `assertPatientVisible()`, so switching the policy - or extending it with new
 * roles - is a change to one predicate rather than a hunt through controllers.
 *
 * Set PATIENT_VISIBILITY.DOCTOR to "ALL" to revert to unrestricted access and
 * watch the patient list (and every dependent screen) change with no other
 * edits. Both modes are exercised by `npm run verify`.
 */
export const PATIENT_VISIBILITY: Record<Role, "ALL" | "APPOINTED_ONLY"> = {
  RECEPTIONIST: "ALL",
  DOCTOR: "APPOINTED_ONLY",
};

/** Prisma filter limiting patients to the records this user may read. */
export function patientWhere(auth: AuthUser): Prisma.PatientWhereInput {
  if (auth.role === "RECEPTIONIST") return {};
  if (PATIENT_VISIBILITY.DOCTOR === "ALL") return {};

  return {
    appointments: { some: { doctorId: requireDoctorId(auth) } },
  };
}

/** Prisma filter limiting appointments to the records this user may read. */
export function appointmentWhere(auth: AuthUser): Prisma.AppointmentWhereInput {
  if (auth.role === "RECEPTIONIST") return {};
  return { doctorId: requireDoctorId(auth) };
}

/**
 * Ensures the user may read this patient's record. Unknown ids and
 * out-of-scope ids both return 404: a doctor must not be able to probe the
 * patient table by observing which ids exist.
 */
export async function assertPatientVisible(auth: AuthUser, patientId: string): Promise<void> {
  const patient = await prisma.patient.findFirst({
    where: { AND: [{ id: patientId }, patientWhere(auth)] },
    select: { id: true },
  });
  if (!patient) throw AppError.notFound("Patient not found");
}

/** The doctor id for a DOCTOR user; throws 403 for any other role. */
export function requireDoctorId(auth: AuthUser): string {
  if (auth.role !== "DOCTOR" || !auth.doctorId) {
    throw AppError.forbidden("This action is only available to doctors");
  }
  return auth.doctorId;
}

/** True when the user may create/edit patients / manage the clinic schedule. */
export function canManageClinic(auth: AuthUser): boolean {
  return auth.role === "RECEPTIONIST";
}
