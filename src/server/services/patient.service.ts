import { Prisma, PatientStatus } from "@prisma/client";
import { prisma } from "@/server/db";
import { AppError } from "@/server/http";
import { patientWhere } from "@/server/auth/access";
import { mapPatientDetail, mapPatientList, patientDetailInclude, patientListInclude } from "@/server/mappers";
import type { PatientInput, PatientQuery } from "@/server/validators/patient";
import type { AuthUser, Paginated, PatientDetail, PatientListItem } from "@/types";
import { parseDateOnly, todayDateOnly } from "@/utils/date";

/**
 * Turns a search term into Prisma filters. Multi-word terms ("rohan shar") are
 * matched token by token against name, phone and email, which also lets
 * PostgreSQL use the pg_trgm indexes added in the migrations.
 */
function buildSearchFilters(term: string): Prisma.PatientWhereInput[] {
  return term
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 5)
    .map((token) => ({
      OR: [
        { firstName: { contains: token, mode: "insensitive" } },
        { lastName: { contains: token, mode: "insensitive" } },
        { phone: { contains: token, mode: "insensitive" } },
        { email: { contains: token, mode: "insensitive" } },
      ],
    }));
}

function buildOrderBy(query: PatientQuery): Prisma.PatientOrderByWithRelationInput[] {
  const direction = query.sortOrder;
  switch (query.sortBy) {
    case "firstName":
      return [{ firstName: direction }, { lastName: "asc" }];
    case "lastName":
      return [{ lastName: direction }, { firstName: "asc" }];
    case "updatedAt":
      return [{ updatedAt: direction }];
    default:
      return [{ createdAt: direction }, { lastName: "asc" }];
  }
}

export async function listPatients(
  auth: AuthUser,
  query: PatientQuery,
): Promise<Paginated<PatientListItem>> {
  const filters: Prisma.PatientWhereInput[] = [patientWhere(auth)];
  if (query.status) filters.push({ status: query.status });
  if (query.search) filters.push(...buildSearchFilters(query.search));

  const where: Prisma.PatientWhereInput = { AND: filters };
  const skip = (query.page - 1) * query.limit;

  const [total, rows] = await Promise.all([
    prisma.patient.count({ where }),
    prisma.patient.findMany({
      where,
      orderBy: buildOrderBy(query),
      skip,
      take: query.limit,
      include: patientListInclude,
    }),
  ]);

  return {
    items: rows.map(mapPatientList),
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}

export async function getPatientById(auth: AuthUser, patientId: string): Promise<PatientDetail> {
  const patient = await prisma.patient.findFirst({
    // The visibility predicate is part of the query, not a post-filter.
    where: { AND: [{ id: patientId }, patientWhere(auth)] },
    include: patientDetailInclude,
  });
  if (!patient) throw AppError.notFound("Patient not found");
  return mapPatientDetail(patient);
}

type PatientWriteData = {
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: PatientInput["gender"];
  phone: string;
  email: string | null;
  address: string | null;
  status: PatientStatus;
};

function toWriteData(input: PatientInput): PatientWriteData {
  const dateOfBirth = parseDateOnly(input.dateOfBirth);
  if (!dateOfBirth) throw AppError.badRequest("Date of birth is not valid", { dateOfBirth: ["Invalid date"] });

  return {
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    dateOfBirth,
    gender: input.gender,
    phone: input.phone.trim(),
    email: input.email,
    address: input.address,
    status: input.status,
  };
}

/** Prevents two records for the same person; compares digits so formats do not matter. */
async function assertPhoneIsUnique(phone: string, ignorePatientId?: string): Promise<void> {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8) return;

  const candidates = await prisma.patient.findMany({
    where: { phone: { endsWith: digits.slice(-10) } },
    select: { id: true, firstName: true, lastName: true, phone: true },
  });

  const duplicate = candidates.find(
    (candidate) => candidate.id !== ignorePatientId && candidate.phone.replace(/\D/g, "") === digits,
  );

  if (duplicate) {
    throw AppError.conflict(
      `${duplicate.firstName} ${duplicate.lastName} is already registered with this phone number`,
      { phone: ["This phone number is already registered to another patient"] },
    );
  }
}

export async function createPatient(auth: AuthUser, input: PatientInput): Promise<PatientListItem> {
  void auth; // Authorization is enforced by the route (RECEPTIONIST only).
  const data = toWriteData(input);
  await assertPhoneIsUnique(data.phone);

  const created = await prisma.patient.create({ data, include: patientListInclude });
  return mapPatientList(created);
}

export async function updatePatient(
  auth: AuthUser,
  patientId: string,
  input: PatientInput,
): Promise<PatientListItem> {
  const existing = await prisma.patient.findFirst({
    where: { AND: [{ id: patientId }, patientWhere(auth)] },
    select: { id: true, status: true },
  });
  if (!existing) throw AppError.notFound("Patient not found");

  const data = toWriteData(input);

  // Archiving a patient with future bookings would orphan those appointments,
  // so the schedule must be cleared first.
  if (data.status === PatientStatus.ARCHIVED && existing.status !== PatientStatus.ARCHIVED) {
    const upcoming = await prisma.appointment.count({
      where: { patientId, status: "SCHEDULED", appointmentDate: { gte: todayDateOnly() } },
    });
    if (upcoming > 0) {
      throw AppError.conflict(
        `This patient has ${upcoming} upcoming appointment${upcoming === 1 ? "" : "s"}. Cancel or complete them before archiving.`,
        { status: ["Resolve upcoming appointments before archiving"] },
      );
    }
  }

  await assertPhoneIsUnique(data.phone, patientId);

  const updated = await prisma.patient.update({
    where: { id: patientId },
    data,
    include: patientListInclude,
  });
  return mapPatientList(updated);
}
