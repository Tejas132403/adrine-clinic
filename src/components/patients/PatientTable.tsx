"use client";

import Link from "next/link";
import { CalendarPlus, Eye, Pencil } from "lucide-react";
import type { PatientListItem } from "@/types";
import { Avatar } from "@/components/ui/Avatar";
import { PatientStatusBadge } from "@/components/ui/Badge";
import { TableSkeleton } from "@/components/ui/States";
import { formatAge, formatDate, formatGender } from "@/utils/format";

export function PatientTable({
  patients,
  loading,
  canEdit,
  onEdit,
  emptyState,
}: {
  patients: PatientListItem[];
  loading: boolean;
  canEdit: boolean;
  onEdit: (patient: PatientListItem) => void;
  emptyState: React.ReactNode;
}) {
  if (loading) return <TableSkeleton rows={7} columns={5} />;
  if (patients.length === 0) return <>{emptyState}</>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead className="bg-surface-subtle">
          <tr>
            <th scope="col" className="table-head-cell pl-4 sm:pl-5">
              Patient
            </th>
            <th scope="col" className="table-head-cell hidden md:table-cell">
              Contact
            </th>
            <th scope="col" className="table-head-cell">
              Status
            </th>
            <th scope="col" className="table-head-cell hidden lg:table-cell">
              Last appointment
            </th>
            <th scope="col" className="table-head-cell pr-4 text-right sm:pr-5">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {patients.map((patient) => (
            <tr key={patient.id} className="transition-colors hover:bg-surface-subtle">
              <td className="table-cell pl-4 sm:pl-5">
                <div className="flex items-center gap-3">
                  <Avatar name={`${patient.firstName} ${patient.lastName}`} size="sm" />
                  <div className="min-w-0">
                    <Link
                      href={`/patients/${patient.id}`}
                      className="block truncate font-medium text-ink hover:text-brand-700 hover:underline"
                    >
                      {patient.firstName} {patient.lastName}
                    </Link>
                    <span className="mt-0.5 block text-xs text-ink-soft">
                      {formatAge(patient.dateOfBirth)} · {formatGender(patient.gender)}
                    </span>
                  </div>
                </div>
              </td>
              <td className="table-cell hidden md:table-cell">
                <span className="block text-ink-muted">{patient.phone}</span>
                <span className="mt-0.5 block truncate text-xs text-ink-soft">{patient.email ?? "No email on file"}</span>
              </td>
              <td className="table-cell">
                <PatientStatusBadge status={patient.status} />
              </td>
              <td className="table-cell hidden lg:table-cell">
                {patient.lastAppointment ? (
                  <>
                    <span className="block text-ink-muted">{formatDate(patient.lastAppointment.date)}</span>
                    <span className="mt-0.5 block text-xs text-ink-soft">
                      {patient.lastAppointment.doctorName}
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-ink-soft">No visits yet</span>
                )}
              </td>
              <td className="table-cell pr-4 sm:pr-5">
                <div className="flex items-center justify-end gap-0.5">
                  <Link
                    href={`/patients/${patient.id}`}
                    title="View patient profile"
                    aria-label={`View ${patient.firstName} ${patient.lastName}`}
                    className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-ink"
                  >
                    <Eye className="h-4 w-4" />
                  </Link>
                  {canEdit && patient.status !== "ARCHIVED" ? (
                    <Link
                      href={`/appointments?new=1&patientId=${patient.id}`}
                      title="Book appointment"
                      aria-label={`Book appointment for ${patient.firstName} ${patient.lastName}`}
                      className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-brand-700"
                    >
                      <CalendarPlus className="h-4 w-4" />
                    </Link>
                  ) : null}
                  {canEdit ? (
                    <button
                      type="button"
                      title="Edit patient"
                      aria-label={`Edit ${patient.firstName} ${patient.lastName}`}
                      onClick={() => onEdit(patient)}
                      className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-ink"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
