import { authRoute, jsonOk } from "@/server/http";
import { getCurrentUser } from "@/server/services/auth.service";

/** GET /api/auth/me - the signed-in user, read from the database. */
export const GET = authRoute(async ({ auth }) => {
  const user = await getCurrentUser(auth.id);
  return jsonOk({ user });
});
