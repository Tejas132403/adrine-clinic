"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CalendarPlus, FileHeart, Pencil, Phone, ShieldAlert } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useApiResource } from "@/hooks/useApiResource";
import { appointmentService, patientService } from "@/services/clinic.service";
import { messageOf } from "@/utils/apiErrors";
import { PageHeader } from "@/components/layout/PageHeader";
import { DetailItem, Panel, PanelHeader } from "@/components/ui/Panel";
import { Button, buttonClasses } from "@/components/ui/Button";
import { PatientStatusBadge } from "@/components/ui/Badge";
import { ErrorState, Skeleton } from "@/components/ui/States";
import { AppointmentHistoryTable } from "@/components/patients/AppointmentHistoryTable";
import { AppointmentDetailsDialog } from "@/components/appointments/AppointmentDetailsDialog";
import { ClinicalNoteDialog } from "@/components/patients/ClinicalNoteDialog";
import { ClinicalNoteList } from "@/components/patients/ClinicalNoteList";
import { PatientFormDialog } from "@/components/patients/PatientFormDialog";
import type { AppointmentItem } from "@/types";
import { formatAge, formatDate, formatGender, formatPatientStatus } from "@/utils/format";

export default function PatientProfilePage() {
  const params = useParams<{ id: string }>();
  const patientId = params.id;
  const { user, isDoctor, isReceptionist } = useAuth();
  const toast = useToast();

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentItem | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const { data: patient, loading, error, errorStatus, reload } = useApiResource(
    () => patientService.get(patientId),
    [patientId, user.id],
  );

  const { data: notes, loading: notesLoading, reload: reloadNotes } = useApiResource(
    () => patientService.listNotes(patientId),
    [patientId, user.id],
  );

  const handleComplete = async (appointment: AppointmentItem) => {
    try {
      await appointmentService.complete(appointment.id);
      toast.success("Appointment completed", `${appointment.patient.firstName}'s visit has been marked as completed.`);
      await reload();
      await reloadNotes();
    } catch (caught) {
      toast.error("Unable to complete appointment", messageOf(caught, "Please try again."));
    }
  };

  /** Doctors may only write notes against their own, non-cancelled visits. */
  const writableAppointments = useMemo(
    () =>
      (patient?.appointments ?? []).filter(
        (appointment) =>
          appointment.status !== "CANCELLED" && (isDoctor ? appointment.doctor.id === user.doctorId : false),
      ),
    [patient, isDoctor, user.doctorId],
  );

  if (error) {
    const notFound = errorStatus === 404;
    return (
      <>
        <Link
          href="/patients"
          className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-muted hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back to patients
        </Link>
        <Panel>
          <ErrorState
            title={notFound ? "Patient not found" : "Unable to load this patient"}
            description={
              notFound
                ? "This record does not exist, or it is not part of your patient list."
                : error
            }
            onRetry={reload}
          />
        </Panel>
      </>
    );
  }

  if (loading && !patient) {
    return (
      <>
        <Skeleton className="mb-4 h-7 w-56" />
        <Panel className="mb-4">
          <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </div>
        </Panel>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <Panel className="lg:col-span-3">
            <div className="space-y-3 p-5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </Panel>
          <Panel className="lg:col-span-2">
            <div className="space-y-3 p-5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-16 w-full" />
            </div>
          </Panel>
        </div>
      </>
    );
  }

  if (!patient) return null;

  const patientName = `${patient.firstName} ${patient.lastName}`;

  return (
    <>
      <Link
        href="/patients"
        className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Back to patients
      </Link>

      <PageHeader
        title={patientName}
        description={`${formatAge(patient.dateOfBirth)} · ${formatGender(patient.gender)} · Registered ${formatDate(patient.createdAt.slice(0, 10))}`}
        actions={
          <>
            {isReceptionist ? (
              <Button
                variant="secondary"
                icon={<Pencil className="h-3.5 w-3.5" />}
                onClick={() => setEditOpen(true)}
              >
                Edit details
              </Button>
            ) : null}
            {isDoctor ? (
              <Button
                icon={<FileHeart className="h-3.5 w-3.5" />}
                disabled={writableAppointments.length === 0}
                onClick={() => setNoteOpen(true)}
                title={
                  writableAppointments.length === 0
                    ? "You need a scheduled appointment with this patient to add a note"
                    : "Add a clinical note"
                }
              >
                Add clinical note
              </Button>
            ) : null}
            {isReceptionist ? (
              <Link
                href={`/appointments?new=1&patientId=${patient.id}`}
                className={buttonClasses({ variant: "primary" })}
              >
                <CalendarPlus className="h-3.5 w-3.5" />
                Book appointment
              </Link>
            ) : null}
          </>
        }
      />

      <Panel className="mb-4">
        <PanelHeader
          title="Patient details"
          action={<PatientStatusBadge status={patient.status} />}
        />
        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 px-4 py-4 sm:grid-cols-2 sm:px-5 lg:grid-cols-4">
          <DetailItem label="Full name" value={patientName} />
          <DetailItem
            label="Date of birth & Age"
            value={`${formatDate(patient.dateOfBirth)} (Age: ${formatAge(patient.dateOfBirth)})`}
          />
          <DetailItem label="Gender" value={formatGender(patient.gender)} />
          <DetailItem
            label="Status"
            value={
              <span>
                {formatPatientStatus(patient.status)}
                {patient.status !== "ACTIVE" ? (
                  <span className="mt-0.5 block text-xs text-ink-soft">
                    {patient.status === "ARCHIVED" ? "Cannot be booked" : "Book with caution"}
                  </span>
                ) : null}
              </span>
            }
          />
          <DetailItem
            label="Phone"
            value={
              <a href={`tel:${patient.phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-1.5 text-brand-700 hover:underline">
                <Phone className="h-3.5 w-3.5" aria-hidden />
                {patient.phone}
              </a>
            }
          />
          <DetailItem
            label="Email"
            value={
              patient.email ? (
                <a href={`mailto:${patient.email}`} className="text-brand-700 hover:underline">
                  {patient.email}
                </a>
              ) : (
                <span className="text-ink-soft">Not provided</span>
              )
            }
          />
          <DetailItem label="Address" value={patient.address ?? <span className="text-ink-soft">Not provided</span>} className="sm:col-span-2" />
        </dl>
      </Panel>

      {isDoctor && writableAppointments.length === 0 ? (
        <div className="mb-4 flex items-start gap-2.5 rounded-card border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-800">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>
            Clinical notes can only be added against one of your own scheduled or completed visits.
            You currently have no bookable visit with this patient.
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Panel className="lg:col-span-3">
          <PanelHeader
            title="Appointment history"
            description={`${patient.appointments.length} visit${patient.appointments.length === 1 ? "" : "s"} on record`}
          />
          <AppointmentHistoryTable
            appointments={patient.appointments}
            loading={loading}
            onView={(appointment) => {
              setSelectedAppointment(appointment);
              setDetailsOpen(true);
            }}
          />
        </Panel>

        <Panel className="lg:col-span-2">
          <PanelHeader
            title="Clinical notes"
            description={`${(notes ?? patient.clinicalNotes).length} note${(notes ?? patient.clinicalNotes).length === 1 ? "" : "s"}`}
            action={
              isDoctor && writableAppointments.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setNoteOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[13px] font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <FileHeart className="h-3.5 w-3.5" aria-hidden />
                  Add note
                </button>
              ) : undefined
            }
          />
          <ClinicalNoteList notes={notes ?? patient.clinicalNotes} loading={notesLoading} />
        </Panel>
      </div>

      <AppointmentDetailsDialog
        appointment={selectedAppointment}
        open={detailsOpen}
        canManage={isReceptionist}
        onClose={() => setDetailsOpen(false)}
        onComplete={handleComplete}
        onAddNote={() => {
          setDetailsOpen(false);
          setNoteOpen(true);
        }}
      />

      <ClinicalNoteDialog
        open={noteOpen}
        patientId={patient.id}
        patientName={patientName}
        appointments={writableAppointments}
        onClose={() => setNoteOpen(false)}
        onSaved={() => void reloadNotes()}
      />

      <PatientFormDialog
        open={editOpen}
        patient={patient}
        onClose={() => setEditOpen(false)}
        onSaved={() => void reload()}
      />
    </>
  );
}
