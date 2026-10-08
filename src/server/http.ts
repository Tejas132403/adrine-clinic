import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import type { AuthUser, Role } from "@/types";
import { getAuthUserFromRequest } from "@/server/auth/session";

/** Application error carrying the HTTP status the client should receive. */
export class AppError extends Error {
  readonly status: number;
  readonly errors?: Record<string, string[]>;

  constructor(status: number, message: string, errors?: Record<string, string[]>) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.errors = errors;
  }

  static badRequest(message = "Invalid request", errors?: Record<string, string[]>) {
    return new AppError(400, message, errors);
  }

  static unauthorized(message = "Authentication required") {
    return new AppError(401, message);
  }

  static forbidden(message = "You do not have permission to perform this action") {
    return new AppError(403, message);
  }

  static notFound(message = "Resource not found") {
    return new AppError(404, message);
  }

  static conflict(message: string, errors?: Record<string, string[]>) {
    return new AppError(409, message, errors);
  }
}

export type RouteParams = Record<string, string>;

type PublicContext<P extends RouteParams> = {
  request: NextRequest;
  params: P;
};

type AuthedContext<P extends RouteParams> = PublicContext<P> & {
  auth: AuthUser;
};

/** 2xx JSON envelope: { success: true, data, meta? } */
export function jsonOk<T>(data: T, init?: { status?: number; meta?: unknown }): NextResponse {
  return NextResponse.json(
    { success: true, data, ...(init?.meta === undefined ? {} : { meta: init.meta }) },
    { status: init?.status ?? 200 },
  );
}

/** Error envelope: { success: false, message, errors? } */
export function jsonError(status: number, message: string, errors?: Record<string, string[]>): NextResponse {
  return NextResponse.json({ success: false, message, ...(errors ? { errors } : {}) }, { status });
}

/** Query string as a plain object (empty values dropped) for zod coercion. */
export function queryParams(request: NextRequest): Record<string, string> {
  const params: Record<string, string> = {};
  request.nextUrl.searchParams.forEach((value, key) => {
    if (value !== "") params[key] = value;
  });
  return params;
}

/** Thrown when the request body is not valid JSON. */
export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw AppError.badRequest("Request body must be valid JSON");
  }
}

function handleError(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return jsonError(error.status, error.message, error.errors);
  }

  if (error instanceof ZodError) {
    return jsonError(400, "Validation failed", error.flatten().fieldErrors as Record<string, string[]>);
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2002":
        return jsonError(409, "A record with these details already exists");
      case "P2003":
        return jsonError(400, "Related record does not exist");
      case "P2025":
        return jsonError(404, "Resource not found");
      case "P2034":
        return jsonError(409, "The request conflicted with another booking. Please try again.");
      default:
        break;
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return jsonError(400, "Invalid data supplied to the database");
  }

  console.error("[api] Unhandled error:", error);
  return jsonError(500, "Something went wrong on our side. Please try again.");
}

/** Wraps a public route handler: parsing, error mapping, no authentication. */
export function publicRoute<P extends RouteParams = RouteParams>(
  handler: (context: PublicContext<P>) => Promise<NextResponse>,
) {
  return async (request: NextRequest, context: { params: Promise<P> }): Promise<NextResponse> => {
    try {
      const params = ((await context?.params) ?? ({} as P)) as P;
      return await handler({ request, params });
    } catch (error) {
      return handleError(error);
    }
  };
}

/**
 * Wraps an authenticated route handler. Authorization is enforced here, before
 * the handler runs - never by hiding UI. Pass `roles` for role-restricted
 * endpoints (403 when the role is not permitted).
 */
export function authRoute<P extends RouteParams = RouteParams>(
  handler: (context: AuthedContext<P>) => Promise<NextResponse>,
  options: { roles?: Role[] } = {},
) {
  return async (request: NextRequest, context: { params: Promise<P> }): Promise<NextResponse> => {
    try {
      const auth = await getAuthUserFromRequest(request);
      if (!auth) throw AppError.unauthorized();

      if (options.roles && !options.roles.includes(auth.role)) {
        throw AppError.forbidden(
          auth.role === "DOCTOR"
            ? "Doctors cannot access this part of the clinic workspace"
            : "Reception staff cannot access this part of the clinic workspace",
        );
      }

      const params = ((await context?.params) ?? ({} as P)) as P;
      return await handler({ request, params, auth });
    } catch (error) {
      return handleError(error);
    }
  };
}
