import { AppointmentStatus } from "@prisma/client";
import { prisma } from "@/server/db";
import { AppError } from "@/server/http";
import { assertPatientVisible, requireDoctorId } from "@/server/auth/access";
import { mapNote, noteInclude } from "@/server/mappers";
import type { ClinicalNoteInput } from "@/server/validators/note";
import type { AuthUser, NoteItem } from "@/types";

/**
 * Clinical notes are part of the clinical record: only doctors may write them,
 * and a doctor may only write about a visit that is actually theirs.
 * Both the patient-visibility predicate and the appointment ownership check
 * are enforced here, in the database query - not in the UI.
 */
export async function addClinicalNote(
  auth: AuthUser,
  patientId: string,
  input: ClinicalNoteInput,
): Promise<NoteItem> {
  const doctorId = requireDoctorId(auth);
  await assertPatientVisible(auth, patientId);

  const appointment = await prisma.appointment.findUnique({
    where: { id: input.appointmentId },
    select: { id: true, patientId: true, doctorId: true, status: true },
  });
  if (!appointment) throw AppError.notFound("Appointment not found");

  if (appointment.doctorId !== doctorId) {
    throw AppError.forbidden("You can only add clinical notes to your own appointments");
  }
  if (appointment.patientId !== patientId) {
    throw AppError.badRequest("This appointment does not belong to the selected patient");
  }
  if (appointment.status === AppointmentStatus.CANCELLED) {
    throw AppError.conflict("Clinical notes cannot be added to a cancelled appointment");
  }

  const created = await prisma.clinicalNote.create({
    data: {
      patientId,
      doctorId,
      appointmentId: appointment.id,
      note: input.note.trim(),
    },
    include: noteInclude,
  });

  return mapNote(created);
}

/** Notes visible to the caller for a patient they are allowed to see. */
export async function listClinicalNotes(auth: AuthUser, patientId: string): Promise<NoteItem[]> {
  await assertPatientVisible(auth, patientId);

  const notes = await prisma.clinicalNote.findMany({
    where: { patientId },
    orderBy: { createdAt: "desc" },
    include: noteInclude,
  });

  return notes.map(mapNote);
}
