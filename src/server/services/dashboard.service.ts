import { AppointmentStatus } from "@prisma/client";
import { prisma } from "@/server/db";
import { appointmentWhere, patientWhere } from "@/server/auth/access";
import { appointmentInclude, mapAppointment } from "@/server/mappers";
import { ACTIVITY_CHART_DAYS, DASHBOARD_WINDOW_DAYS, TODAY_SCHEDULE_LIMIT } from "@/server/config";
import type { AppointmentItem, AuthUser, DashboardActivityPoint, DashboardStats } from "@/types";
import { addDays, timeToMinutes, toDateOnlyString, todayDateOnly } from "@/utils/date";

function emptyStatusCount(): Record<AppointmentStatus, number> {
  return {
    [AppointmentStatus.SCHEDULED]: 0,
    [AppointmentStatus.COMPLETED]: 0,
    [AppointmentStatus.CANCELLED]: 0,
  };
}

function activityLabel(dateOnly: string, today: Date): string {
  const date = new Date(`${dateOnly}T00:00:00.000Z`);
  if (date.getTime() === today.getTime()) return "Today";
  return date.toLocaleDateString("en-IN", { weekday: "short", timeZone: "UTC" });
}

/**
 * One request powers the whole dashboard. Every query is scoped by the caller's
 * role, so a doctor sees their own schedule and their own patients while
 * reception sees the whole clinic - without a second code path.
 */
export async function getDashboardStats(auth: AuthUser): Promise<DashboardStats> {
  const today = todayDateOnly();
  const activityStart = addDays(today, -(ACTIVITY_CHART_DAYS - 1));
  const windowStart = addDays(today, -DASHBOARD_WINDOW_DAYS);
  const upcomingEnd = addDays(today, 7);
  const scope = appointmentWhere(auth);

  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();

  const [
    todayGroups,
    activityGroups,
    upcomingAppointments,
    totalPatients,
    completedAppointments,
    cancelledAppointments,
    todaySchedule,
    nextAppointment,
  ] = await Promise.all([
    prisma.appointment.groupBy({
      by: ["status"],
      where: { AND: [scope, { appointmentDate: today }] },
      _count: { _all: true },
    }),
    prisma.appointment.groupBy({
      by: ["appointmentDate", "status"],
      where: { AND: [scope, { appointmentDate: { gte: activityStart, lte: today } }] },
      _count: { _all: true },
    }),
    prisma.appointment.count({
      where: {
        AND: [
          scope,
          { status: AppointmentStatus.SCHEDULED, appointmentDate: { gt: today, lte: upcomingEnd } },
        ],
      },
    }),
    prisma.patient.count({ where: patientWhere(auth) }),
    prisma.appointment.count({
      where: {
        AND: [
          scope,
          { status: AppointmentStatus.COMPLETED, appointmentDate: { gte: windowStart, lte: today } },
        ],
      },
    }),
    prisma.appointment.count({
      where: {
        AND: [
          scope,
          { status: AppointmentStatus.CANCELLED, appointmentDate: { gte: windowStart, lte: today } },
        ],
      },
    }),
    prisma.appointment.findMany({
      where: { AND: [scope, { appointmentDate: today }] },
      orderBy: { startTime: "asc" },
      take: TODAY_SCHEDULE_LIMIT,
      include: appointmentInclude,
    }),
    findNextAppointment(scope, today, nowMinutes),
  ]);

  const todayByStatus = emptyStatusCount();
  for (const group of todayGroups) {
    todayByStatus[group.status] = group._count._all;
  }

  const activityByDate = new Map<string, Record<AppointmentStatus, number>>();
  for (let offset = 0; offset < ACTIVITY_CHART_DAYS; offset += 1) {
    activityByDate.set(toDateOnlyString(addDays(activityStart, offset)), emptyStatusCount());
  }
  for (const group of activityGroups) {
    const key = toDateOnlyString(group.appointmentDate);
    const bucket = activityByDate.get(key);
    if (bucket) bucket[group.status] = group._count._all;
  }

  const activity: DashboardActivityPoint[] = [...activityByDate.entries()].map(([date, counts]) => ({
    date,
    label: activityLabel(date, today),
    scheduled: counts[AppointmentStatus.SCHEDULED],
    completed: counts[AppointmentStatus.COMPLETED],
    cancelled: counts[AppointmentStatus.CANCELLED],
    total:
      counts[AppointmentStatus.SCHEDULED] +
      counts[AppointmentStatus.COMPLETED] +
      counts[AppointmentStatus.CANCELLED],
  }));

  return {
    scope: auth.role,
    todayAppointments: todayByStatus[AppointmentStatus.SCHEDULED] + todayByStatus[AppointmentStatus.COMPLETED],
    todayByStatus,
    upcomingAppointments,
    totalPatients,
    completedAppointments,
    cancelledAppointments,
    completedWindowDays: DASHBOARD_WINDOW_DAYS,
    activity,
    todaySchedule: todaySchedule.map(mapAppointment),
    nextAppointment,
  };
}

/** The next visit that has not happened yet (today's remaining, else a future day). */
async function findNextAppointment(
  scope: ReturnType<typeof appointmentWhere>,
  today: Date,
  nowMinutes: number,
): Promise<AppointmentItem | null> {
  const candidates = await prisma.appointment.findMany({
    where: {
      AND: [scope, { status: AppointmentStatus.SCHEDULED, appointmentDate: { gte: today } }],
    },
    orderBy: [{ appointmentDate: "asc" }, { startTime: "asc" }],
    take: 12,
    include: appointmentInclude,
  });

  const upcoming = candidates.find((appointment) => {
    if (appointment.appointmentDate.getTime() > today.getTime()) return true;
    if (toDateOnlyString(appointment.appointmentDate) !== toDateOnlyString(today)) return false;
    const start = timeToMinutes(appointment.startTime) ?? 0;
    return start >= nowMinutes;
  });

  return upcoming ? mapAppointment(upcoming) : null;
}
