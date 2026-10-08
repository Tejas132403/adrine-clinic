"use client";

import { Building2, CheckCircle2, Database, LogOut, Stethoscope, XCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useApiResource } from "@/hooks/useApiResource";
import { doctorService } from "@/services/clinic.service";
import { PageHeader } from "@/components/layout/PageHeader";
import { DetailItem, Panel, PanelHeader } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/States";
import { CLINIC_HOURS_LABEL } from "@/utils/clinic";

const RECEPTION_CAPABILITIES: Array<[string, boolean]> = [
  ["Register and edit patients", true],
  ["Search, filter and sort the patient register", true],
  ["Create, reschedule, cancel and complete appointments", true],
  ["Add clinical notes", false],
];

const DOCTOR_CAPABILITIES: Array<[string, boolean]> = [
  ["View own appointments", true],
  ["View patients you have appointments with", true],
  ["Add clinical notes to your own visits", true],
  ["Manage the clinic schedule", false],
  ["Register or edit patient records", false],
];

export default function SettingsPage() {
  const { user, isDoctor, logout } = useAuth();
  const { data: doctors, loading, error, reload } = useApiResource(() => doctorService.list(), [user.id]);
  const capabilities = isDoctor ? DOCTOR_CAPABILITIES : RECEPTION_CAPABILITIES;

  return (
    <>
      <PageHeader
        title="Settings"
        description="Your profile, the access your role has, and the clinic directory."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <PanelHeader title="Your profile" description="Read from the user record backing your session" />
          <div className="px-4 py-4 sm:px-5">
            <div className="flex items-center gap-4">
              <Avatar name={user.name} size="lg" />
              <div className="min-w-0">
                <p className="text-base font-semibold text-ink">{user.name}</p>
                <p className="text-sm text-ink-muted">{user.email}</p>
                <div className="mt-1.5">
                  <Badge tone={isDoctor ? "brand" : "info"} dot>
                    {isDoctor ? `Doctor · ${user.specialization ?? "General"}` : "Receptionist"}
                  </Badge>
                </div>
              </div>
            </div>

            <dl className="mt-5 grid grid-cols-1 gap-4 border-t border-slate-100 pt-4 sm:grid-cols-3">
              <DetailItem label="Role" value={isDoctor ? "Doctor" : "Receptionist"} />
              <DetailItem label="Doctor record" value={user.doctorId ? "Linked" : "Not applicable"} />
              <DetailItem label="Session" value="Signed in with a bearer JWT (8 hours)" />
            </dl>

            <div className="mt-5 border-t border-slate-100 pt-4">
              <Button
                variant="dangerGhost"
                size="sm"
                icon={<LogOut className="h-3.5 w-3.5" />}
                onClick={() => void logout()}
              >
                Sign out
              </Button>
            </div>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Access for your role" description="Enforced by the API, not just the interface" />
          <ul className="divide-y divide-slate-100">
            {capabilities.map(([label, allowed]) => (
              <li key={label} className="flex items-start gap-2.5 px-4 py-3 text-[13px] sm:px-5">
                {allowed ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                ) : (
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" aria-hidden />
                )}
                <span className={allowed ? "text-ink-muted" : "text-ink-soft line-through decoration-slate-300"}>
                  {label}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <PanelHeader
            title="Clinic directory"
            description="Doctors available for booking and their upcoming load"
            action={
              error ? (
                <Button variant="secondary" size="sm" onClick={reload}>
                  Try again
                </Button>
              ) : undefined
            }
          />
          {error ? (
            <div className="px-4 py-5 text-[13px] text-rose-700 sm:px-5">{error}</div>
          ) : loading ? (
            <div className="space-y-2 p-4 sm:p-5">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-12 animate-pulse rounded bg-slate-200/60" />
              ))}
            </div>
          ) : (doctors ?? []).length === 0 ? (
            <EmptyState icon={Stethoscope} title="No doctors configured" description="Add doctors to the clinic directory to start booking." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {(doctors ?? []).map((doctor) => (
                <li key={doctor.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5 sm:px-5">
                  <Avatar name={doctor.name} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink">{doctor.name}</p>
                    <p className="text-xs text-ink-soft">
                      {doctor.specialization} · {doctor.phone}
                    </p>
                  </div>
                  <span className="text-xs text-ink-muted">
                    {doctor.upcomingAppointments} upcoming appointment
                    {doctor.upcomingAppointments === 1 ? "" : "s"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel>
          <PanelHeader title="Workspace" description="Environment the app is running against" />
          <dl className="grid grid-cols-1 gap-4 px-4 py-4 sm:px-5">
            <DetailItem
              label="Data store"
              value={
                <span className="inline-flex items-center gap-1.5">
                  <Database className="h-3.5 w-3.5 text-ink-soft" aria-hidden />
                  PostgreSQL · Prisma ORM
                </span>
              }
            />
            <DetailItem
              label="Clinic hours enforced on booking"
              value={
                <span className="inline-flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-ink-soft" aria-hidden />
                  {CLINIC_HOURS_LABEL}
                </span>
              }
            />
            <DetailItem label="REST API base" value="/api (Bearer token or session cookie)" />
            <DetailItem
              label="Reset demo data"
              value={<code className="rounded bg-surface-muted px-1.5 py-0.5 text-xs">npm run db:seed</code>}
            />
            <DetailItem
              label="Verify the API"
              value={<code className="rounded bg-surface-muted px-1.5 py-0.5 text-xs">npm run verify</code>}
            />
          </dl>
        </Panel>
      </div>
    </>
  );
}
