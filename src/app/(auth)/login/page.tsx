import type { Metadata } from "next";
import { Activity, CalendarCheck2, FileHeart, UserCheck } from "lucide-react";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = { title: "Sign in" };

const HIGHLIGHTS = [
  { icon: CalendarCheck2, text: "Front desk scheduling with conflict checks built in" },
  { icon: UserCheck, text: "Patient records scoped to the role that needs them" },
  { icon: FileHeart, text: "Doctors record clinical notes against a visit" },
];

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Brand panel */}
      <section className="relative flex flex-col justify-between bg-brand-700 px-6 py-10 text-white lg:w-[46%] lg:px-12 lg:py-14">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-white/12 ring-1 ring-inset ring-white/25">
            <Activity className="h-[18px] w-[18px]" strokeWidth={2.4} aria-hidden />
          </span>
          <span>
            <span className="block text-sm font-semibold leading-tight">Adrine Clinic</span>
            <span className="block text-2xs uppercase tracking-[0.14em] text-white/70">
              Outpatient management
            </span>
          </span>
        </div>

        <div className="mt-10 max-w-md lg:mt-0">
          <h1 className="text-2xl font-semibold leading-snug tracking-[-0.01em] sm:text-[1.75rem]">
            One workspace for the front desk and the consulting room.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-white/80">
            Register patients, run the day&apos;s schedule, and keep clinical notes attached to the
            visit they belong to.
          </p>

          <ul className="mt-8 space-y-3">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-[13px] text-white/90">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-white/70" aria-hidden />
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-10 text-2xs text-white/60 lg:mt-0">
          Technical assessment build · PostgreSQL · Next.js · Prisma
        </p>
      </section>

      {/* Form panel */}
      <section className="flex flex-1 items-center justify-center bg-white px-5 py-10 sm:px-8">
        <div className="w-full max-w-sm">
          <h2 className="text-lg font-semibold text-ink">Sign in</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Use your clinic account to continue.
          </p>
          <div className="mt-7">
            <LoginForm />
          </div>
        </div>
      </section>
    </div>
  );
}
