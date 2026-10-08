import { prisma } from "@/server/db";
import { AppError } from "@/server/http";
import { signAuthToken } from "@/server/auth/jwt";
import { verifyPassword } from "@/server/auth/password";
import type { LoginInput } from "@/server/validators/auth";
import type { AuthUser } from "@/types";

type UserWithDoctor = {
  id: string;
  name: string;
  email: string;
  role: AuthUser["role"];
  doctor: { id: string; specialization: string } | null;
};

function toAuthUser(user: UserWithDoctor): AuthUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    doctorId: user.doctor?.id ?? null,
    specialization: user.doctor?.specialization ?? null,
  };
}

/**
 * Verifies credentials and issues a JWT.
 * The failure message is identical for unknown emails and wrong passwords so
 * the endpoint cannot be used to enumerate accounts.
 */
export async function login(input: LoginInput): Promise<{ token: string; user: AuthUser }> {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    include: { doctor: { select: { id: true, specialization: true } } },
  });

  if (!user) throw AppError.unauthorized("Incorrect email or password");

  const passwordMatches = await verifyPassword(input.password, user.passwordHash);
  if (!passwordMatches) throw AppError.unauthorized("Incorrect email or password");

  const authUser = toAuthUser(user);
  const token = await signAuthToken({
    id: authUser.id,
    name: authUser.name,
    email: authUser.email,
    role: authUser.role,
    doctorId: authUser.doctorId,
    specialization: authUser.specialization,
  });

  return { token, user: authUser };
}

/** Reads the user fresh from the database, so role changes take effect at once. */
export async function getCurrentUser(userId: string): Promise<AuthUser> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { doctor: { select: { id: true, specialization: true } } },
  });
  if (!user) throw AppError.unauthorized("Your session is no longer valid");
  return toAuthUser(user);
}
