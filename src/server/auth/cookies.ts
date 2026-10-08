import type { NextResponse } from "next/server";
import { AUTH_COOKIE, tokenTtlSeconds } from "@/server/auth/jwt";

const baseOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

/** Stores the JWT in an httpOnly cookie so browser scripts cannot read it. */
export function setSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set(AUTH_COOKIE, token, { ...baseOptions, maxAge: tokenTtlSeconds() });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(AUTH_COOKIE, "", { ...baseOptions, maxAge: 0 });
}
