import { redirect } from "next/navigation";
import { getServerSessionUser } from "@/server/auth/session";
import { AuthProvider } from "@/context/AuthContext";
import { AppShell } from "@/components/layout/AppShell";

/**
 * Protected area. The session is verified on the server before anything
 * renders, and the resolved user is handed to the client context so screens
 * never flash an "unknown user" state. The API re-checks on every request.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getServerSessionUser();
  if (!user) redirect("/login");

  return (
    <AuthProvider user={user}>
      <AppShell>{children}</AppShell>
    </AuthProvider>
  );
}
