"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CalendarDays, CalendarPlus, Clock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useApiResource, useDebouncedValue } from "@/hooks/useApiResource";
import { appointmentService, doctorService } from "@/services/clinic.service";
import { PageHeader } from "@/components/layout/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { buttonClasses } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { AppointmentTable } from "@/components/appointments/AppointmentTable";
import { AppointmentDetailsDialog } from "@/components/appointments/AppointmentDetailsDialog";
import { AppointmentFormDialog } from "@/components/appointments/AppointmentFormDialog";
import { ClinicalNoteDialog } from "@/components/patients/ClinicalNoteDialog";
import { ALL_DATES, AppointmentFilters, TODAY } from "@/components/appointments/AppointmentFilters";
import { messageOf } from "@/utils/apiErrors";
import type { AppointmentItem, AppointmentStatus, DoctorSummary } from "@/types";
import { formatDate } from "@/utils/format";

const PAGE_SIZE = 10;

export default function AppointmentsPage() {
  const { user, isReceptionist } = useAuth();
  const toast = useToast();
  const searchParams = useSearchParams();

  const [dateFilter, setDateFilter] = useState<string>(TODAY);
  const [doctorFilter, setDoctorFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "reschedule">("create");
  const [editing, setEditing] = useState<AppointmentItem | null>(null);
  const [defaultPatientId, setDefaultPatientId] = useState<string | null>(null);
  const [selected, setSelected] = useState<AppointmentItem | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<AppointmentItem | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [noteAppointment, setNoteAppointment] = useState<AppointmentItem | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);

  const debouncedSearch = useDebouncedValue(search, 350);
  const { data: doctors } = useApiResource(() => doctorService.list(), [user.id]);

  // Deep links: /appointments?new=1[&patientId=…], /appointments?date=today
  useEffect(() => {
    const requestedDate = searchParams.get("date");
    if (requestedDate) setDateFilter(requestedDate);

    if (searchParams.get("new") === "1" && isReceptionist) {
      setEditing(null);
      setFormMode("create");
      setDefaultPatientId(searchParams.get("patientId"));
      setFormOpen(true);
    }
  }, [searchParams, isReceptionist]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, doctorFilter, dateFilter]);

  const params = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      date: dateFilter,
      doctorId: doctorFilter,
      status: statusFilter,
      search: debouncedSearch.trim() || undefined,
      sortBy: "appointmentDate" as const,
      // A single day reads chronologically; the full list reads newest first.
      sortOrder: (dateFilter === ALL_DATES ? "desc" : "asc") as "asc" | "desc",
    }),
    [page, dateFilter, doctorFilter, statusFilter, debouncedSearch],
  );

  const { data, loading, error, reload } = useApiResource(
    () => appointmentService.list(params),
    [params, user.id],
    { keepPreviousData: true },
  );

  const appointments = data?.items ?? [];
  const meta = data?.meta ?? { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 };

  const resetFilters = () => {
    setDateFilter(TODAY);
    setDoctorFilter("ALL");
    setStatusFilter("ALL");
    setSearch("");
  };

  const openCreate = () => {
    setEditing(null);
    setFormMode("create");
    setDefaultPatientId(null);
    setFormOpen(true);
  };

  const handleComplete = useCallback(
    async (appointment: AppointmentItem) => {
      setBusyId(appointment.id);
      try {
        await appointmentService.complete(appointment.id);
        toast.success(
          "Appointment marked as completed",
          `${appointment.patient.firstName} ${appointment.patient.lastName} · ${formatDate(appointment.appointmentDate)}`,
        );
        await reload();
      } catch (caught) {
        toast.error("Unable to complete this appointment", messageOf(caught, "Please try again."));
      } finally {
        setBusyId(null);
      }
    },
    [reload, toast],
  );

  const confirmCancel = useCallback(async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await appointmentService.cancel(cancelTarget.id);
      toast.success("Appointment cancelled", "The slot is free for other bookings.");
      setCancelTarget(null);
      setDetailsOpen(false);
      await reload();
    } catch (caught) {
      toast.error("Unable to cancel this appointment", messageOf(caught, "Please try again."));
    } finally {
      setCancelling(false);
    }
  }, [cancelTarget, reload, toast]);

  const openReschedule = useCallback((appointment: AppointmentItem) => {
    setEditing(appointment);
    setFormMode("reschedule");
    setFormOpen(true);
  }, []);

  const openDetails = useCallback((appointment: AppointmentItem) => {
    setSelected(appointment);
    setDetailsOpen(true);
  }, []);

  const handleOpenNote = useCallback((appointment: AppointmentItem) => {
    setSelected(null);
    setDetailsOpen(false);
    setNoteAppointment(appointment);
    setNoteOpen(true);
  }, []);

  const dateLabel = dateFilter === TODAY ? "today" : dateFilter === ALL_DATES ? "across all dates" : `on ${formatDate(dateFilter)}`;

  return (
    <>
      <PageHeader
        title={isReceptionist ? "Appointments" : "My appointments"}
        description={
          loading && !data
            ? "Loading the schedule…"
            : `${meta.total} appointment${meta.total === 1 ? "" : "s"} ${dateLabel}${isReceptionist ? " across the clinic" : ""}`
        }
        actions={
          isReceptionist ? (
            <button type="button" className={buttonClasses({ variant: "primary" })} onClick={openCreate}>
              <CalendarPlus className="h-3.5 w-3.5" />
              New appointment
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[13px] text-ink-muted">
              <Clock className="h-3.5 w-3.5 text-ink-soft" aria-hidden />
              Doctor Schedule
            </span>
          )
        }
      />

      <Panel>
        <AppointmentFilters
          dateFilter={dateFilter}
          doctorFilter={doctorFilter}
          statusFilter={statusFilter}
          search={search}
          doctors={(doctors ?? []) as DoctorSummary[]}
          showDoctorFilter={isReceptionist}
          resultCount={meta.total}
          loading={loading}
          onDateChange={setDateFilter}
          onDoctorChange={setDoctorFilter}
          onStatusChange={setStatusFilter}
          onSearchChange={setSearch}
          onReset={resetFilters}
        />

        {error ? (
          <ErrorState title="Unable to load appointments" description={error} onRetry={reload} />
        ) : (
          <AppointmentTable
            appointments={appointments}
            loading={loading && appointments.length === 0}
            canManage={isReceptionist}
            busyId={busyId}
            onView={openDetails}
            onReschedule={isReceptionist ? openReschedule : undefined}
            onCancel={isReceptionist ? setCancelTarget : undefined}
            onComplete={(appointment) => void handleComplete(appointment)}
            onAddNote={handleOpenNote}
            emptyState={
              <EmptyState
                icon={CalendarDays}
                title={
                  dateFilter === TODAY
                    ? "No appointments today"
                    : dateFilter === ALL_DATES
                      ? "No appointments match these filters"
                      : `No appointments on ${formatDate(dateFilter)}`
                }
                description={
                  isReceptionist
                    ? "Adjust the filters or book a new visit."
                    : "Nothing is scheduled in this view."
                }
                action={
                  isReceptionist ? (
                    <button type="button" className={buttonClasses({ variant: "primary", size: "sm" })} onClick={openCreate}>
                      <CalendarPlus className="h-3.5 w-3.5" />
                      New appointment
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={buttonClasses({ variant: "secondary", size: "sm" })}
                      onClick={resetFilters}
                    >
                      Reset filters
                    </button>
                  )
                }
              />
            }
          />
        )}

        {!error && appointments.length > 0 ? (
          <Pagination meta={meta} onPageChange={setPage} disabled={loading} />
        ) : null}
      </Panel>

      <AppointmentDetailsDialog
        appointment={selected}
        open={detailsOpen}
        canManage={isReceptionist}
        onClose={() => setDetailsOpen(false)}
        onReschedule={(appointment) => {
          setDetailsOpen(false);
          openReschedule(appointment);
        }}
        onCancel={setCancelTarget}
        onComplete={(appointment) => void handleComplete(appointment)}
        onAddNote={handleOpenNote}
      />

      <AppointmentFormDialog
        open={formOpen}
        mode={formMode}
        appointment={formMode === "reschedule" ? editing : null}
        defaultPatientId={defaultPatientId}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
          setDefaultPatientId(null);
        }}
        onSaved={() => void reload()}
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

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        title="Cancel this appointment?"
        message={
          cancelTarget
            ? `${cancelTarget.patient.firstName} ${cancelTarget.patient.lastName} with ${cancelTarget.doctor.name} on ${formatDate(cancelTarget.appointmentDate)} at ${cancelTarget.startTime}. The slot will be released and marked as cancelled.`
            : ""
        }
        confirmLabel="Cancel appointment"
        cancelLabel="Keep appointment"
        loading={cancelling}
        onConfirm={() => void confirmCancel()}
        onCancel={() => setCancelTarget(null)}
      />
    </>
  );
}
