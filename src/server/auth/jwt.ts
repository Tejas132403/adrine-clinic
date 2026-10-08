import { SignJWT, jwtVerify } from "jose";
import type { AuthUser, Role } from "@/types";

/** Name of the httpOnly cookie that carries the JWT for browser sessions. */
export const AUTH_COOKIE = "clinic_token";

const DEFAULT_EXPIRES_IN = "8h";

type TokenClaims = {
  name: string;
  email: string;
  role: Role;
  doctorId: string | null;
  specialization: string | null;
};

function secretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not configured. Copy .env.example to .env and set a value.");
  }
  return new TextEncoder().encode(secret);
}

export function tokenTtlSeconds(): number {
  const raw = process.env.JWT_EXPIRES_IN?.trim() || DEFAULT_EXPIRES_IN;
  const match = /^(\d+)([smhd])$/.exec(raw);
  if (!match) return 8 * 60 * 60;
  const amount = Number(match[1]);
  const unit = match[2];
  const multiplier = unit === "s" ? 1 : unit === "m" ? 60 : unit === "h" ? 3600 : 24 * 3600;
  return amount * multiplier;
}

export async function signAuthToken(user: TokenClaims & { id: string }): Promise<string> {
  return new SignJWT({
    name: user.name,
    email: user.email,
    role: user.role,
    doctorId: user.doctorId,
    specialization: user.specialization,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_EXPIRES_IN?.trim() || DEFAULT_EXPIRES_IN)
    .sign(secretKey());
}

/** Returns the authenticated user carried by a token, or null when invalid/expired. */
export async function verifyAuthToken(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    const id = payload.sub;
    const role = payload.role;
    if (typeof id !== "string" || (role !== "RECEPTIONIST" && role !== "DOCTOR")) return null;

    return {
      id,
      name: typeof payload.name === "string" ? payload.name : "Unknown user",
      email: typeof payload.email === "string" ? payload.email : "",
      role,
      doctorId: typeof payload.doctorId === "string" ? payload.doctorId : null,
      specialization: typeof payload.specialization === "string" ? payload.specialization : null,
    };
  } catch {
    return null;
  }
}
