import { cookies } from "next/headers";
import type { AuthUser } from "@/types";
import { AUTH_COOKIE, verifyAuthToken } from "./jwt";

/**
 * Accepts either `Authorization: Bearer <token>` (used by the SPA and by
 * Postman/curl) or the httpOnly session cookie (used by the browser).
 */
export async function getAuthUserFromRequest(request: Request): Promise<AuthUser | null> {
  const authorization = request.headers.get("authorization");
  const bearer = authorization?.toLowerCase().startsWith("bearer ")
    ? authorization.slice(7).trim()
    : null;

  const token = bearer || readCookie(request, AUTH_COOKIE);
  if (!token) return null;
  return verifyAuthToken(token);
}

/** Reads the session user inside server components. */
export async function getServerSessionUser(): Promise<AuthUser | null> {
  const store = await cookies();
  const token = store.get(AUTH_COOKIE)?.value;
  if (!token) return null;
  return verifyAuthToken(token);
}

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}
