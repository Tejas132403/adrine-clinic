"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, UserPlus, Users } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useApiResource, useDebouncedValue } from "@/hooks/useApiResource";
import { patientService } from "@/services/clinic.service";
import { PageHeader } from "@/components/layout/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { buttonClasses } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { PatientFilters, toListParams, type PatientSortOption } from "@/components/patients/PatientFilters";
import { PatientTable } from "@/components/patients/PatientTable";
import { PatientFormDialog, type EditablePatient } from "@/components/patients/PatientFormDialog";
import type { PatientStatus } from "@/types";

const PAGE_SIZE = 10;

export default function PatientsPage() {
  const { user, isReceptionist } = useAuth();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<PatientStatus | "ALL">("ALL");
  const [sort, setSort] = useState<PatientSortOption>("createdAt:desc");
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EditablePatient | null>(null);

  const debouncedSearch = useDebouncedValue(search, 350);

  // Deep link from the dashboard / top bar: /patients?new=1
  useEffect(() => {
    if (searchParams.get("new") === "1" && isReceptionist) {
      setEditing(null);
      setFormOpen(true);
    }
  }, [searchParams, isReceptionist]);

  // Any filter change starts from the first page.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, sort]);

  const params = useMemo(
    () => toListParams(page, PAGE_SIZE, debouncedSearch, status, sort),
    [page, debouncedSearch, status, sort],
  );

  const { data, loading, error, reload } = useApiResource(
    () => patientService.list(params),
    [params, user.id],
    { keepPreviousData: true },
  );

  const patients = data?.items ?? [];
  const meta = data?.meta ?? { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 };
  const filtersActive = debouncedSearch.trim().length > 0 || status !== "ALL";

  const resetFilters = () => {
    setSearch("");
    setStatus("ALL");
    setSort("createdAt:desc");
  };

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  return (
    <>
      <PageHeader
        title={isReceptionist ? "Patients" : "My patients"}
        description={
          loading && !data
            ? "Loading patient records…"
            : isReceptionist
              ? `${meta.total} patient record${meta.total === 1 ? "" : "s"} in the clinic register`
              : `${meta.total} patient${meta.total === 1 ? "" : "s"} you have appointments with`
        }
        actions={
          isReceptionist ? (
            <button type="button" className={buttonClasses({ variant: "primary" })} onClick={openCreate}>
              <UserPlus className="h-3.5 w-3.5" />
              Register patient
            </button>
          ) : undefined
        }
      />

      {isReceptionist ? null : (
        <div className="mb-4 flex items-start gap-2.5 rounded-card border border-brand-200 bg-brand-50 px-4 py-3 text-[13px] text-brand-800">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>
            You can view patients you have an appointment with. Reception staff manage registrations and
            changes to patient details.
          </p>
        </div>
      )}

      <Panel>
        <PatientFilters
          search={search}
          status={status}
          sort={sort}
          resultCount={meta.total}
          loading={loading}
          onSearchChange={setSearch}
          onStatusChange={setStatus}
          onSortChange={setSort}
          onReset={resetFilters}
        />

        {error ? (
          <ErrorState title="Unable to load patients" description={error} onRetry={reload} />
        ) : (
          <PatientTable
            patients={patients}
            loading={loading && patients.length === 0}
            canEdit={isReceptionist}
            onEdit={(patient) => {
              setEditing(patient);
              setFormOpen(true);
            }}
            emptyState={
              filtersActive ? (
                <EmptyState
                  icon={Users}
                  title="No patients match these filters"
                  description="Try a different name, phone number or status."
                  action={
                    <button
                      type="button"
                      className={buttonClasses({ variant: "secondary", size: "sm" })}
                      onClick={resetFilters}
                    >
                      Clear filters
                    </button>
                  }
                />
              ) : (
                <EmptyState
                  icon={Users}
                  title={isReceptionist ? "No patients registered yet" : "No patients yet"}
                  description={
                    isReceptionist
                      ? "Register the first patient to start booking appointments."
                      : "Patients you have appointments with will appear here."
                  }
                  action={
                    isReceptionist ? (
                      <button
                        type="button"
                        className={buttonClasses({ variant: "primary", size: "sm" })}
                        onClick={openCreate}
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        Register patient
                      </button>
                    ) : (
                      <Link href="/appointments" className={buttonClasses({ variant: "secondary", size: "sm" })}>
                        View your appointments
                      </Link>
                    )
                  }
                />
              )
            }
          />
        )}

        {!error && patients.length > 0 ? (
          <Pagination meta={meta} onPageChange={setPage} disabled={loading} />
        ) : null}
      </Panel>

      <PatientFormDialog
        open={formOpen}
        patient={editing}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSaved={() => void reload()}
      />
    </>
  );
}
