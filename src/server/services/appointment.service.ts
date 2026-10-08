import { AppointmentStatus, PatientStatus, Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { AppError } from "@/server/http";
import { appointmentWhere } from "@/server/auth/access";
import { appointmentInclude, mapAppointment } from "@/server/mappers";
import { CLINIC_HOURS } from "@/server/config";
import type { AppointmentInput, AppointmentQuery } from "@/server/validators/appointment";
import type { AppointmentItem, AuthUser, BookedSlot, Paginated } from "@/types";
import { formatTime12h, parseDateOnly, timeToMinutes, todayDateOnly } from "@/utils/date";

type DbClient = Prisma.TransactionClient | typeof prisma;

function toAppointmentDate(value: string): Date {
  const parsed = parseDateOnly(value);
  if (!parsed) throw AppError.badRequest("Appointment date is not valid", { appointmentDate: ["Invalid date"] });
  return parsed;
}

function assertWithinClinicHours(startTime: string, endTime: string): void {
  const open = timeToMinutes(CLINIC_HOURS.open) ?? 0;
  const close = timeToMinutes(CLINIC_HOURS.close) ?? 0;
  const start = timeToMinutes(startTime) ?? 0;
  const end = timeToMinutes(endTime) ?? 0;

  if (start < open || end > close) {
    throw AppError.badRequest(
      `The clinic is open ${CLINIC_HOURS.label}. Choose a slot within those hours.`,
      { startTime: [`Appointments must be booked between ${CLINIC_HOURS.label}`] },
    );
  }
}

/**
 * Overlap query: two slots collide when one starts before the other ends and
 * ends after the other starts. Cancelled appointments free their slot, and
 * adjacent bookings (10:00-10:30 then 10:30-11:00) are allowed.
 */
function findConflict(
  client: DbClient,
  params: { doctorId: string; appointmentDate: Date; startTime: string; endTime: string; excludeId?: string },
) {
  return client.appointment.findFirst({
    where: {
      doctorId: params.doctorId,
      appointmentDate: params.appointmentDate,
      status: { not: AppointmentStatus.CANCELLED },
      ...(params.excludeId ? { id: { not: params.excludeId } } : {}),
      startTime: { lt: params.endTime },
      endTime: { gt: params.startTime },
    },
    select: {
      id: true,
      startTime: true,
      endTime: true,
      patient: { select: { firstName: true, lastName: true } },
    },
  });
}

function conflictError(
  doctorName: string,
  conflict: { startTime: string; endTime: string; patient: { firstName: string; lastName: string } },
): AppError {
  const patient = `${conflict.patient.firstName} ${conflict.patient.lastName}`;
  const message = `${doctorName} already has an appointment from ${formatTime12h(conflict.startTime)} to ${formatTime12h(conflict.endTime)} (${patient}). This slot is unavailable.`;
  return AppError.conflict(message, { startTime: [message], endTime: [message] });
}

function buildOrderBy(query: AppointmentQuery): Prisma.AppointmentOrderByWithRelationInput[] {
  const direction = query.sortOrder;
  switch (query.sortBy) {
    case "createdAt":
      return [{ createdAt: direction }];
    case "startTime":
      return [{ appointmentDate: direction }, { startTime: direction }];
    default:
      return [{ appointmentDate: direction }, { startTime: direction }];
  }
}

export async function listAppointments(
  auth: AuthUser,
  query: AppointmentQuery,
): Promise<Paginated<AppointmentItem>> {
  const filters: Prisma.AppointmentWhereInput[] = [appointmentWhere(auth)];

  if (query.status) filters.push({ status: query.status });
  if (query.doctorId) filters.push({ doctorId: query.doctorId });
  if (query.patientId) filters.push({ patientId: query.patientId });
  if (query.date) {
    filters.push({ appointmentDate: query.date === "today" ? todayDateOnly() : toAppointmentDate(query.date) });
  }
  if (query.search) {
    filters.push({
      OR: [
        { reason: { contains: query.search, mode: "insensitive" } },
        { patient: { firstName: { contains: query.search, mode: "insensitive" } } },
        { patient: { lastName: { contains: query.search, mode: "insensitive" } } },
        { patient: { phone: { contains: query.search, mode: "insensitive" } } },
      ],
    });
  }

  const where: Prisma.AppointmentWhereInput = { AND: filters };
  const skip = (query.page - 1) * query.limit;

  const [total, rows] = await Promise.all([
    prisma.appointment.count({ where }),
    prisma.appointment.findMany({
      where,
      orderBy: buildOrderBy(query),
      skip,
      take: query.limit,
      include: appointmentInclude,
    }),
  ]);

  return {
    items: rows.map(mapAppointment),
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}

export async function getAppointmentById(auth: AuthUser, appointmentId: string): Promise<AppointmentItem> {
  const appointment = await prisma.appointment.findFirst({
    where: { AND: [{ id: appointmentId }, appointmentWhere(auth)] },
    include: appointmentInclude,
  });
  if (!appointment) throw AppError.notFound("Appointment not found");
  return mapAppointment(appointment);
}

/** Doctors and patients that a booking form is allowed to reference. */
async function assertBookablePatient(patientId: string, client: DbClient = prisma) {
  const patient = await client.patient.findUnique({
    where: { id: patientId },
    select: { id: true, firstName: true, lastName: true, status: true },
  });
  if (!patient) throw AppError.badRequest("Patient not found", { patientId: ["Select a registered patient"] });
  if (patient.status === PatientStatus.ARCHIVED) {
    throw AppError.conflict(
      `${patient.firstName} ${patient.lastName} is archived. Restore the patient before booking an appointment.`,
      { patientId: ["Archived patients cannot be booked"] },
    );
  }
  return patient;
}

async function assertDoctorExists(doctorId: string, client: DbClient = prisma) {
  const doctor = await client.doctor.findUnique({ where: { id: doctorId }, include: { user: true } });
  if (!doctor) throw AppError.badRequest("Doctor not found", { doctorId: ["Select a valid doctor"] });
  return doctor;
}

export async function createAppointment(auth: AuthUser, input: AppointmentInput): Promise<AppointmentItem> {
  void auth; // Receptionist-only route.
  const appointmentDate = toAppointmentDate(input.appointmentDate);
  const today = todayDateOnly();
  if (appointmentDate.getTime() < today.getTime()) {
    throw AppError.badRequest("Appointments cannot be booked in the past", {
      appointmentDate: ["Choose today or a future date"],
    });
  }
  assertWithinClinicHours(input.startTime, input.endTime);

  const patient = await assertBookablePatient(input.patientId);
  const doctor = await assertDoctorExists(input.doctorId);

  const created = await prisma.$transaction(
    async (tx) => {
      const conflict = await findConflict(tx, {
        doctorId: doctor.id,
        appointmentDate,
        startTime: input.startTime,
        endTime: input.endTime,
      });
      if (conflict) throw conflictError(doctor.user.name, conflict);

      return tx.appointment.create({
        data: {
          patientId: patient.id,
          doctorId: doctor.id,
          appointmentDate,
          startTime: input.startTime,
          endTime: input.endTime,
          reason: input.reason.trim(),
          status: AppointmentStatus.SCHEDULED,
        },
        include: appointmentInclude,
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );

  return mapAppointment(created);
}

/** Reschedules (or corrects) an appointment. Only scheduled visits can move. */
export async function updateAppointment(
  auth: AuthUser,
  appointmentId: string,
  input: AppointmentInput,
): Promise<AppointmentItem> {
  void auth;
  const existing = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { id: true, status: true },
  });
  if (!existing) throw AppError.notFound("Appointment not found");
  if (existing.status !== AppointmentStatus.SCHEDULED) {
    throw AppError.conflict(
      existing.status === AppointmentStatus.CANCELLED
        ? "This appointment was cancelled and can no longer be rescheduled."
        : "This appointment is already completed and can no longer be rescheduled.",
    );
  }

  const appointmentDate = toAppointmentDate(input.appointmentDate);
  assertWithinClinicHours(input.startTime, input.endTime);

  const patient = await assertBookablePatient(input.patientId);
  const doctor = await assertDoctorExists(input.doctorId);

  const updated = await prisma.$transaction(
    async (tx) => {
      const conflict = await findConflict(tx, {
        doctorId: doctor.id,
        appointmentDate,
        startTime: input.startTime,
        endTime: input.endTime,
        excludeId: appointmentId,
      });
      if (conflict) throw conflictError(doctor.user.name, conflict);

      return tx.appointment.update({
        where: { id: appointmentId },
        data: {
          patientId: patient.id,
          doctorId: doctor.id,
          appointmentDate,
          startTime: input.startTime,
          endTime: input.endTime,
          reason: input.reason.trim(),
        },
        include: appointmentInclude,
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );

  return mapAppointment(updated);
}

export async function cancelAppointment(auth: AuthUser, appointmentId: string): Promise<AppointmentItem> {
  void auth;
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { id: true, status: true },
  });
  if (!appointment) throw AppError.notFound("Appointment not found");
  if (appointment.status === AppointmentStatus.CANCELLED) {
    throw AppError.conflict("This appointment is already cancelled.");
  }
  if (appointment.status === AppointmentStatus.COMPLETED) {
    throw AppError.conflict("Completed appointments cannot be cancelled.");
  }

  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: AppointmentStatus.CANCELLED },
    include: appointmentInclude,
  });
  return mapAppointment(updated);
}

export async function completeAppointment(auth: AuthUser, appointmentId: string): Promise<AppointmentItem> {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { id: true, doctorId: true, status: true, appointmentDate: true },
  });
  if (!appointment) throw AppError.notFound("Appointment not found");
  if (auth.role === "DOCTOR" && appointment.doctorId !== auth.doctorId) {
    throw AppError.forbidden("Doctors may only mark their own appointments as completed.");
  }
  if (appointment.status === AppointmentStatus.COMPLETED) {
    throw AppError.conflict("This appointment is already marked as completed.");
  }
  if (appointment.status === AppointmentStatus.CANCELLED) {
    throw AppError.conflict("Cancelled appointments cannot be completed.");
  }
  if (appointment.appointmentDate.getTime() > todayDateOnly().getTime()) {
    throw AppError.conflict("A future appointment cannot be marked as completed.");
  }

  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: AppointmentStatus.COMPLETED },
    include: appointmentInclude,
  });
  return mapAppointment(updated);
}

/** Booked slots for a doctor on a date - powers the "already booked" hints in the UI. */
export async function getDoctorAvailability(
  auth: AuthUser,
  params: { doctorId: string; date: string; excludeAppointmentId?: string },
): Promise<BookedSlot[]> {
  void auth;
  const appointmentDate = toAppointmentDate(params.date);

  const booked = await prisma.appointment.findMany({
    where: {
      doctorId: params.doctorId,
      appointmentDate,
      status: { not: AppointmentStatus.CANCELLED },
      ...(params.excludeAppointmentId ? { id: { not: params.excludeAppointmentId } } : {}),
    },
    orderBy: { startTime: "asc" },
    select: {
      id: true,
      startTime: true,
      endTime: true,
      patient: { select: { firstName: true, lastName: true } },
    },
  });

  return booked.map((slot) => ({
    id: slot.id,
    startTime: slot.startTime,
    endTime: slot.endTime,
    patientName: `${slot.patient.firstName} ${slot.patient.lastName}`,
  }));
}
