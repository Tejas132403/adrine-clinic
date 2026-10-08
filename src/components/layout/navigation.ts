import { CalendarDays, LayoutDashboard, Settings, Users, type LucideIcon } from "lucide-react";
import type { Role } from "@/types";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Short description used in the sidebar tooltip on collapsed widths. */
  description: string;
};

const RECEPTION_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, description: "Today at a glance" },
  { href: "/patients", label: "Patients", icon: Users, description: "Register and manage patients" },
  { href: "/appointments", label: "Appointments", icon: CalendarDays, description: "Schedule and update visits" },
  { href: "/settings", label: "Settings", icon: Settings, description: "Profile and clinic directory" },
];

const DOCTOR_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, description: "Your day at a glance" },
  { href: "/appointments", label: "My appointments", icon: CalendarDays, description: "Your schedule" },
  { href: "/patients", label: "My patients", icon: Users, description: "Patients you have seen" },
  { href: "/settings", label: "Settings", icon: Settings, description: "Profile and clinic directory" },
];

export function navigationFor(role: Role): NavItem[] {
  return role === "DOCTOR" ? DOCTOR_NAV : RECEPTION_NAV;
}

/** Section label shown in the top bar for the active route. */
export function sectionLabelFor(pathname: string, role: Role): string {
  if (pathname.startsWith("/dashboard")) return "Dashboard";
  if (pathname.startsWith("/patients")) return role === "DOCTOR" ? "My patients" : "Patients";
  if (pathname.startsWith("/appointments")) return role === "DOCTOR" ? "My appointments" : "Appointments";
  if (pathname.startsWith("/settings")) return "Settings";
  return "Clinic";
}
