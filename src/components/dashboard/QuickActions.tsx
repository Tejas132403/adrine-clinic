import Link from "next/link";
import { CalendarPlus, CalendarRange, Search, UserPlus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

/**
 * Only actions that resolve to real screens: each link opens the relevant
 * screen with the right dialog already open.
 */
export function QuickActions() {
  const { isDoctor } = useAuth();

  const actions = isDoctor
    ? [
        { label: "Today's schedule", description: "Review your bookings", href: "/appointments?date=today", icon: CalendarRange },
        { label: "My patients", description: "Open a patient record", href: "/patients", icon: Search },
      ]
    : [
        { label: "Register patient", description: "Add someone new", href: "/patients?new=1", icon: UserPlus },
        { label: "New appointment", description: "Book a visit", href: "/appointments?new=1", icon: CalendarPlus },
        { label: "Today's schedule", description: "Manage the day list", href: "/appointments?date=today", icon: CalendarRange },
        { label: "Find a patient", description: "Search the register", href: "/patients", icon: Search },
      ];

  return (
    <ul className="divide-y divide-slate-100">
      {actions.map(({ label, description, href, icon: Icon }) => (
        <li key={href}>
          <Link
            href={href}
            className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-subtle sm:px-5"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-surface-subtle text-slate-500">
              <Icon className="h-4 w-4" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-[13px] font-medium text-ink">{label}</span>
              <span className="block text-2xs text-ink-soft">{description}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
