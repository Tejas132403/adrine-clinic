import { authRoute, jsonOk } from "@/server/http";
import { listDoctors } from "@/server/services/doctor.service";

/** GET /api/doctors - used by the doctor filters and booking form. */
export const GET = authRoute(async () => {
  const doctors = await listDoctors();
  return jsonOk(doctors);
});
