/**
 * Shared domain types.
 *
 * These unions mirror the Prisma enums exactly, but are declared locally so
 * that client components never import `@prisma/client` (which would pull the
 * database layer into the browser bundle).
 */

export const ROLES = ["RECEPTIONIST", "DOCTOR"] as const;
export type Role = (typeof ROLES)[number];

export const GENDERS = ["MALE", "FEMALE", "OTHER"] as const;
export type Gender = (typeof GENDERS)[number];

export const PATIENT_STATUSES = ["ACTIVE", "INACTIVE", "ARCHIVED"] as const;
export type PatientStatus = (typeof PATIENT_STATUSES)[number];

export const APPOINTMENT_STATUSES = ["SCHEDULED", "COMPLETED", "CANCELLED"] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  doctorId: string | null;
  specialization: string | null;
};

export type DoctorSummary = {
  id: string;
  name: string;
  specialization: string;
  phone: string;
  upcomingAppointments: number;
};

export type AppointmentPatientRef = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  status: PatientStatus;
};

export type AppointmentDoctorRef = {
  id: string;
  name: string;
  specialization: string;
};

export type AppointmentItem = {
  id: string;
  appointmentDate: string; // yyyy-MM-dd
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  status: AppointmentStatus;
  reason: string;
  createdAt: string;
  patient: AppointmentPatientRef;
  doctor: AppointmentDoctorRef;
  noteCount: number;
};

export type NoteItem = {
  id: string;
  note: string;
  createdAt: string;
  doctor: AppointmentDoctorRef;
  appointment: {
    id: string;
    appointmentDate: string;
    startTime: string;
    reason: string;
  };
};

export type PatientListItem = {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string; // yyyy-MM-dd
  gender: Gender;
  phone: string;
  email: string | null;
  address: string | null;
  status: PatientStatus;
  createdAt: string;
  appointmentCount: number;
  lastAppointment: {
    date: string;
    status: AppointmentStatus;
    doctorName: string;
  } | null;
};

export type PatientDetail = PatientListItem & {
  appointments: AppointmentItem[];
  clinicalNotes: NoteItem[];
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type Paginated<T> = {
  items: T[];
  meta: PaginationMeta;
};

export type DashboardActivityPoint = {
  date: string;
  label: string;
  scheduled: number;
  completed: number;
  cancelled: number;
  total: number;
};

export type DashboardStats = {
  scope: Role;
  todayAppointments: number;
  todayByStatus: Record<AppointmentStatus, number>;
  upcomingAppointments: number;
  totalPatients: number;
  completedAppointments: number;
  cancelledAppointments: number;
  completedWindowDays: number;
  activity: DashboardActivityPoint[];
  todaySchedule: AppointmentItem[];
  nextAppointment: AppointmentItem | null;
};

export type BookedSlot = {
  id: string;
  startTime: string;
  endTime: string;
  patientName: string;
};

export type ApiErrorResponse = {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
};

export type ApiSuccessResponse<T> = {
  success: true;
  data: T;
  meta?: unknown;
};
