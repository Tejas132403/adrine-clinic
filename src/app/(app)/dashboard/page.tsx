"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import {
  CalendarCheck2,
  CalendarPlus,
  CalendarX2,
  CheckCircle2,
  Clock,
  UserPlus,
  Users,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useApiResource } from "@/hooks/useApiResource";
import { appointmentService, dashboardService } from "@/services/clinic.service";
import { PageHeader } from "@/components/layout/PageHeader";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { Button, buttonClasses } from "@/components/ui/Button";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/States";
import { StatTile } from "@/components/dashboard/StatTile";
import { ActivityChart } from "@/components/dashboard/ActivityChart";
import { NextAppointmentCard } from "@/components/dashboard/NextAppointmentCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { AppointmentTable } from "@/components/appointments/AppointmentTable";
import { AppointmentDetailsDialog } from "@/components/appointments/AppointmentDetailsDialog";
import { ClinicalNoteDialog } from "@/components/patients/ClinicalNoteDialog";
import { messageOf } from "@/utils/apiErrors";
import type { AppointmentItem } from "@/types";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const { user, isDoctor, isReceptionist } = useAuth();
  const toast = useToast();
  const [selected, setSelected] = useState<AppointmentItem | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [noteAppointment, setNoteAppointment] = useState<AppointmentItem | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);

  const { data: stats, loading, error, reload } = useApiResource(
    () => dashboardService.stats(),
    [user.id],
  );

  const openDetails = useCallback((appointment: AppointmentItem) => {
    setSelected(appointment);
    setDetailsOpen(true);
  }, []);

  const handleComplete = useCallback(
    async (appointment: AppointmentItem) => {
      setBusyId(appointment.id);
      try {
        await appointmentService.complete(appointment.id);
        toast.success(
          "Appointment completed",
          `${appointment.patient.firstName} ${appointment.patient.lastName}'s visit marked as completed.`,
        );
        await reload();
      } catch (caught) {
        toast.error("Unable to complete appointment", messageOf(caught, "Please try again."));
      } finally {
        setBusyId(null);
      }
    },
    [reload, toast],
  );

  const handleOpenNote = useCallback((appointment: AppointmentItem) => {
    setNoteAppointment(appointment);
    setNoteOpen(true);
  }, []);

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const firstName = user.name.replace(/^Dr\.?\s+/i, "").split(" ")[0] ?? user.name;

  if (error) {
    return (
      <>
        <PageHeader title={`${greeting()}, ${firstName}`} description={today} />
        <Panel>
          <ErrorState title="Unable to load the dashboard" description={error} onRetry={reload} />
        </Panel>
      </>
    );
  }

  const todayByStatus = stats?.todayByStatus ?? { SCHEDULED: 0, COMPLETED: 0, CANCELLED: 0 };
  const description = loading
    ? today
    : isDoctor
      ? `${today} · ${stats?.todayAppointments ?? 0} appointment${stats?.todayAppointments === 1 ? "" : "s"} on your list today`
      : `${today} · ${stats?.todayAppointments ?? 0} appointment${stats?.todayAppointments === 1 ? "" : "s"} on the books today`;

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${firstName}`}
        description={description}
        actions={
          isReceptionist ? (
            <>
              <Link href="/patients?new=1" className={buttonClasses({ variant: "secondary", size: "md" })}>
                <UserPlus className="h-3.5 w-3.5" />
                Register patient
              </Link>
              <Link href="/appointments?new=1" className={buttonClasses({ variant: "primary", size: "md" })}>
                <CalendarPlus className="h-3.5 w-3.5" />
                New appointment
              </Link>
            </>
          ) : (
            <Link href="/appointments?date=today" className={buttonClasses({ variant: "secondary", size: "md" })}>
              <CalendarCheck2 className="h-3.5 w-3.5" />
              Today&apos;s schedule
            </Link>
          )
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        <StatTile
          label="Today's visits"
          value={stats?.todayAppointments ?? 0}
          hint={`${todayByStatus.COMPLETED} completed, ${todayByStatus.CANCELLED} cancelled`}
          icon={Clock}
          loading={loading}
        />
        <StatTile
          label="Upcoming visits"
          value={stats?.upcomingAppointments ?? 0}
          hint="Booked from tomorrow onward"
          icon={CalendarCheck2}
          loading={loading}
        />
        <StatTile
          label={isDoctor ? "Assigned patients" : "Total patients"}
          value={stats?.totalPatients ?? 0}
          hint={isDoctor ? "Under your care" : "Registered across clinic"}
          icon={Users}
          loading={loading}
        />
        <StatTile
          label="Completed visits"
          value={stats?.completedAppointments ?? 0}
          hint={`${stats?.cancelledAppointments ?? 0} cancelled overall`}
          icon={CheckCircle2}
          tone="success"
          loading={loading}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 items-start gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2">
          <PanelHeader
            title="Appointment activity"
            description="Visits per day over the last seven days"
            action={
              <Link
                href="/appointments"
                className="text-[13px] font-medium text-brand-700 hover:text-brand-800"
              >
                View all appointments
              </Link>
            }
          />
          <div className="px-4 py-4 sm:px-5">
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-[13.5rem] w-full" />
                <Skeleton className="h-3 w-40" />
              </div>
            ) : (
              <ActivityChart data={stats?.activity ?? []} />
            )}
          </div>
        </Panel>

        <div className="grid grid-cols-1 gap-4">
          <Panel>
            <PanelHeader title="Next appointment" />
            {loading ? (
              <div className="space-y-3 px-4 py-4 sm:px-5">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ) : (
              <NextAppointmentCard appointment={stats?.nextAppointment ?? null} />
            )}
          </Panel>

          <Panel>
            <PanelHeader title="Quick actions" />
            <QuickActions />
          </Panel>
        </div>
      </div>

      <Panel className="mt-4">
        <PanelHeader
          title="Today's schedule"
          description={
            loading
              ? undefined
              : `${todayByStatus.SCHEDULED} upcoming · ${todayByStatus.COMPLETED} completed · ${todayByStatus.CANCELLED} cancelled`
          }
          action={
            <Link
              href="/appointments?date=today"
              className={buttonClasses({ variant: "secondary", size: "sm" })}
            >
              Open full list
            </Link>
          }
        />
        <AppointmentTable
          appointments={stats?.todaySchedule ?? []}
          loading={loading}
          compact
          canManage={isReceptionist}
          busyId={busyId}
          onView={openDetails}
          onComplete={handleComplete}
          onAddNote={handleOpenNote}
          emptyState={
            <EmptyState
              icon={CalendarCheck2}
              title="Nothing scheduled today"
              description={
                isDoctor
                  ? "You have no appointments booked for today."
                  : "No appointments are booked for today yet."
              }
              action={
                isReceptionist ? (
                  <Link href="/appointments?new=1" className={buttonClasses({ variant: "primary", size: "sm" })}>
                    Book the first appointment
                  </Link>
                ) : undefined
              }
            />
          }
        />
      </Panel>

      <p className="mt-4 text-xs text-ink-soft">
        {isDoctor
          ? "You are seeing your own schedule and the patients you have appointments with."
          : "Clinic-wide view: every doctor, patient and appointment."}{" "}
        Last synced {stats ? "just now" : "—"}.
      </p>

      <AppointmentDetailsDialog
        appointment={selected}
        open={detailsOpen}
        canManage={isReceptionist}
        onClose={() => setDetailsOpen(false)}
        onComplete={handleComplete}
        onAddNote={handleOpenNote}
      />

      {noteAppointment ? (
        <ClinicalNoteDialog
          open={noteOpen}
          patientId={noteAppointment.patient.id}
          patientName={`${noteAppointment.patient.firstName} ${noteAppointment.patient.lastName}`}
          appointments={[noteAppointment]}
          onClose={() => {
            setNoteOpen(false);
            setNoteAppointment(null);
          }}
          onSaved={async () => {
            setNoteOpen(false);
            setNoteAppointment(null);
            toast.success("Clinical note recorded", "Your medical note has been saved.");
            await reload();
          }}
        />
      ) : null}
    </>
  );
}
