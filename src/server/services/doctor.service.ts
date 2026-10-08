import { prisma } from "@/server/db";
import { AppError } from "@/server/http";
import type { DoctorSummary } from "@/types";
import { todayDateOnly } from "@/utils/date";

/** Doctors plus how many scheduled visits each has from today onwards. */
export async function listDoctors(): Promise<DoctorSummary[]> {
  const doctors = await prisma.doctor.findMany({
    orderBy: { user: { name: "asc" } },
    include: {
      user: { select: { name: true } },
      _count: {
        select: {
          appointments: { where: { status: "SCHEDULED", appointmentDate: { gte: todayDateOnly() } } },
        },
      },
    },
  });

  return doctors.map((doctor) => ({
    id: doctor.id,
    name: doctor.user.name,
    specialization: doctor.specialization,
    phone: doctor.phone,
    upcomingAppointments: doctor._count.appointments,
  }));
}

export async function getDoctorById(doctorId: string): Promise<DoctorSummary> {
  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
    include: {
      user: { select: { name: true } },
      _count: {
        select: {
          appointments: { where: { status: "SCHEDULED", appointmentDate: { gte: todayDateOnly() } } },
        },
      },
    },
  });

  if (!doctor) throw AppError.notFound("Doctor not found");

  return {
    id: doctor.id,
    name: doctor.user.name,
    specialization: doctor.specialization,
    phone: doctor.phone,
    upcomingAppointments: doctor._count.appointments,
  };
}
