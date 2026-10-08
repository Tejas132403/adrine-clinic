import { authRoute, jsonOk } from "@/server/http";
import { getDashboardStats } from "@/server/services/dashboard.service";

/** GET /api/dashboard/stats - role-scoped operational summary. */
export const GET = authRoute(async ({ auth }) => {
  const stats = await getDashboardStats(auth);
  return jsonOk(stats);
});
