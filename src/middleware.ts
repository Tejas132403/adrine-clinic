import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, verifyAuthToken } from "@/server/auth/jwt";

/**
 * Page-level guard: unauthenticated visitors are redirected to /login before a
 * private screen renders, and signed-in users skip the login screen.
 *
 * This is convenience, not the security boundary - every API call is
 * authorized again on the server (see src/server/http.ts + auth/access.ts).
 */
const PUBLIC_PATHS = ["/login"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  const user = token ? await verifyAuthToken(token) : null;

  const isPublicPath = PUBLIC_PATHS.some((path) => pathname === path);

  if (!user && !isPublicPath) {
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && isPublicPath) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // API routes do their own authorization and must return JSON, not redirects.
  matcher: ["/", "/login", "/dashboard/:path*", "/patients/:path*", "/appointments/:path*", "/settings/:path*"],
};
