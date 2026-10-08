import { apiGet, apiGetWithMeta, apiPatch, apiPost, apiPut } from "./api";
import type {
  AppointmentItem,
  AuthUser,
  BookedSlot,
  DashboardStats,
  DoctorSummary,
  NoteItem,
  Paginated,
  PaginationMeta,
  PatientDetail,
  PatientListItem,
  PatientStatus,
} from "@/types";

/* ------------------------------- auth ---------------------------------- */

export const authService = {
  login: (email: string, password: string) =>
    apiPost<{ token: string; user: AuthUser }>("/auth/login", { email, password }),
  logout: () => apiPost<{ loggedOut: boolean }>("/auth/logout"),
  me: () => apiGet<{ user: AuthUser }>("/auth/me"),
};

/* ------------------------------ patients -------------------------------- */

export type PatientListParams = {
  page?: number;
  limit?: number;
  search?: string;
  status?: PatientStatus | "ALL";
  sortBy?: "createdAt" | "firstName" | "lastName" | "updatedAt";
  sortOrder?: "asc" | "desc";
};

export type PatientPayload = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  phone: string;
  email: string | null;
  address: string | null;
  status: PatientStatus;
};

export const patientService = {
  list: (params: PatientListParams): Promise<Paginated<PatientListItem>> =>
    apiGetWithMeta<PatientListItem[], PaginationMeta>("/patients", {
      ...params,
      status: params.status === "ALL" ? undefined : params.status,
    }).then((response) => ({ items: response.data, meta: response.meta })),

  get: (patientId: string) => apiGet<PatientDetail>(`/patients/${patientId}`),
  create: (payload: PatientPayload) => apiPost<PatientListItem>("/patients", payload),
  update: (patientId: string, payload: PatientPayload) =>
    apiPut<PatientListItem>(`/patients/${patientId}`, payload),

  listNotes: (patientId: string) => apiGet<NoteItem[]>(`/patients/${patientId}/notes`),
  addNote: (patientId: string, payload: { appointmentId: string; note: string }) =>
    apiPost<NoteItem>(`/patients/${patientId}/notes`, payload),
};

/* ----------------------------- appointments ----------------------------- */

export type AppointmentListParams = {
  page?: number;
  limit?: number;
  doctorId?: string;
  patientId?: string;
  status?: AppointmentItem["status"] | "ALL";
  date?: string | "today" | "ALL";
  search?: string;
  sortBy?: "appointmentDate" | "createdAt" | "startTime";
  sortOrder?: "asc" | "desc";
};

export type AppointmentPayload = {
  patientId: string;
  doctorId: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  reason: string;
};

export const appointmentService = {
  list: (params: AppointmentListParams): Promise<Paginated<AppointmentItem>> =>
    apiGetWithMeta<AppointmentItem[], PaginationMeta>("/appointments", {
      ...params,
      status: params.status === "ALL" ? undefined : params.status,
      date: params.date === "ALL" ? undefined : params.date,
      doctorId: params.doctorId === "ALL" ? undefined : params.doctorId,
    }).then((response) => ({ items: response.data, meta: response.meta })),

  get: (appointmentId: string) => apiGet<AppointmentItem>(`/appointments/${appointmentId}`),
  create: (payload: AppointmentPayload) => apiPost<AppointmentItem>("/appointments", payload),
  reschedule: (appointmentId: string, payload: AppointmentPayload) =>
    apiPut<AppointmentItem>(`/appointments/${appointmentId}`, payload),
  cancel: (appointmentId: string) =>
    apiPatch<AppointmentItem>(`/appointments/${appointmentId}/cancel`),
  complete: (appointmentId: string) =>
    apiPatch<AppointmentItem>(`/appointments/${appointmentId}/complete`),
  availability: (params: { doctorId: string; date: string; excludeAppointmentId?: string }) =>
    apiGet<BookedSlot[]>("/appointments/availability", params),
};

/* -------------------------------- doctors ------------------------------- */

export const doctorService = {
  list: () => apiGet<DoctorSummary[]>("/doctors"),
  get: (doctorId: string) => apiGet<DoctorSummary>(`/doctors/${doctorId}`),
};

/* ------------------------------- dashboard ------------------------------ */

export const dashboardService = {
  stats: () => apiGet<DashboardStats>("/dashboard/stats"),
};
