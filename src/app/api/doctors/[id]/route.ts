import { authRoute, jsonOk } from "@/server/http";
import { uuidSchema } from "@/server/validators/common";
import { getDoctorById } from "@/server/services/doctor.service";

type Params = { id: string };

/** GET /api/doctors/:id */
export const GET = authRoute<Params>(async ({ params }) => {
  const doctor = await getDoctorById(uuidSchema.parse(params.id));
  return jsonOk(doctor);
});
