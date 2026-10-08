import { jsonOk, publicRoute } from "@/server/http";
import { clearSessionCookie } from "@/server/auth/cookies";

/** POST /api/auth/logout - clears the httpOnly session cookie. */
export const POST = publicRoute(async () => {
  const response = jsonOk({ loggedOut: true });
  clearSessionCookie(response);
  return response;
});
