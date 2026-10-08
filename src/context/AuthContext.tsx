"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/services/clinic.service";
import type { AuthUser } from "@/types";

type AuthContextValue = {
  user: AuthUser;
  isReceptionist: boolean;
  isDoctor: boolean;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * The signed-in user is resolved on the server (see the protected layout) and
 * passed in here, so protected screens never render in an "unknown user" state.
 */
export function AuthProvider({ user: initialUser, children }: { user: AuthUser; children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState(initialUser);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      setUser(initialUser);
      router.replace("/login");
      router.refresh();
    }
  }, [initialUser, router]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isReceptionist: user.role === "RECEPTIONIST",
      isDoctor: user.role === "DOCTOR",
      logout,
    }),
    [user, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside an AuthProvider");
  return context;
}
