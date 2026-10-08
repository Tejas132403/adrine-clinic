import { Prisma } from "@prisma/client";
import type { AppointmentItem, NoteItem, PatientDetail, PatientListItem } from "@/types";
import { toDateOnlyString } from "@/utils/date";

/**
 * Explicit row -> DTO mapping. Keeping the API shape in one place means the
 * database schema can change without silently changing the public contract,
 * and the response never leaks fields such as password hashes.
 */

export const appointmentInclude = {
  patient: true,
  doctor: { include: { user: true } },
  _count: { select: { clinicalNotes: true } },
} satisfies Prisma.AppointmentInclude;

export const patientListInclude = {
  appointments: {
    orderBy: [{ appointmentDate: "desc" }, { startTime: "desc" }],
    take: 1,
    include: { doctor: { include: { user: true } } },
  },
  _count: { select: { appointments: true } },
} satisfies Prisma.PatientInclude;

export const patientDetailInclude = {
  appointments: {
    orderBy: [{ appointmentDate: "desc" }, { startTime: "desc" }],
    include: appointmentInclude,
  },
  clinicalNotes: {
    orderBy: { createdAt: "desc" },
    include: { doctor: { include: { user: true } }, appointment: true },
  },
  _count: { select: { appointments: true } },
} satisfies Prisma.PatientInclude;

export const noteInclude = {
  doctor: { include: { user: true } },
  appointment: true,
} satisfies Prisma.ClinicalNoteInclude;

type AppointmentRow = Prisma.AppointmentGetPayload<{ include: typeof appointmentInclude }>;
type PatientListRow = Prisma.PatientGetPayload<{ include: typeof patientListInclude }>;
type PatientDetailRow = Prisma.PatientGetPayload<{ include: typeof patientDetailInclude }>;
type NoteRow = Prisma.ClinicalNoteGetPayload<{ include: typeof noteInclude }>;

const appointmentBaseInclude = {
  patient: true,
  doctor: { include: { user: true } },
} satisfies Prisma.AppointmentInclude;

type AppointmentBaseRow = Prisma.AppointmentGetPayload<{ include: typeof appointmentBaseInclude }>;

function mapDoctorRef(doctor: { id: string; specialization: string; user: { name: string } }) {
  return { id: doctor.id, name: doctor.user.name, specialization: doctor.specialization };
}

function mapAppointmentBase(row: AppointmentBaseRow | AppointmentRow): Omit<AppointmentItem, "noteCount"> {
  return {
    id: row.id,
    appointmentDate: toDateOnlyString(row.appointmentDate),
    startTime: row.startTime,
    endTime: row.endTime,
    status: row.status,
    reason: row.reason,
    createdAt: row.createdAt.toISOString(),
    patient: {
      id: row.patient.id,
      firstName: row.patient.firstName,
      lastName: row.patient.lastName,
      phone: row.patient.phone,
      status: row.patient.status,
    },
    doctor: mapDoctorRef(row.doctor),
  };
}

export function mapAppointment(row: AppointmentRow): AppointmentItem {
  return { ...mapAppointmentBase(row), noteCount: row._count.clinicalNotes };
}

/** For lists where the note count is not needed but the tuple type must stay stable. */
export function mapAppointmentWithoutNoteCount(row: AppointmentBaseRow): AppointmentItem {
  return { ...mapAppointmentBase(row), noteCount: 0 };
}

export function mapNote(row: NoteRow): NoteItem {
  return {
    id: row.id,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
    doctor: mapDoctorRef(row.doctor),
    appointment: {
      id: row.appointment.id,
      appointmentDate: toDateOnlyString(row.appointment.appointmentDate),
      startTime: row.appointment.startTime,
      reason: row.appointment.reason,
    },
  };
}

export function mapPatientList(row: PatientListRow): PatientListItem {
  const last = row.appointments[0];
  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    dateOfBirth: toDateOnlyString(row.dateOfBirth),
    gender: row.gender,
    phone: row.phone,
    email: row.email,
    address: row.address,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    appointmentCount: row._count.appointments,
    lastAppointment: last
      ? {
          date: toDateOnlyString(last.appointmentDate),
          status: last.status,
          doctorName: last.doctor.user.name,
        }
      : null,
  };
}

export function mapPatientDetail(row: PatientDetailRow): PatientDetail {
  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    dateOfBirth: toDateOnlyString(row.dateOfBirth),
    gender: row.gender,
    phone: row.phone,
    email: row.email,
    address: row.address,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    appointmentCount: row._count.appointments,
    lastAppointment: row.appointments[0]
      ? {
          date: toDateOnlyString(row.appointments[0].appointmentDate),
          status: row.appointments[0].status,
          doctorName: row.appointments[0].doctor.user.name,
        }
      : null,
    appointments: row.appointments.map(mapAppointment),
    clinicalNotes: row.clinicalNotes.map(mapNote),
  };
}
