import { authRoute, jsonOk } from "@/server/http";
import { uuidSchema } from "@/server/validators/common";
import { completeAppointment } from "@/server/services/appointment.service";

type Params = { id: string };

/** PATCH /api/appointments/:id/complete - reception only. */
export const PATCH = authRoute<Params>(
  async ({ auth, params }) => {
    const appointment = await completeAppointment(auth, uuidSchema.parse(params.id));
    return jsonOk(appointment);
  },
  { roles: ["RECEPTIONIST"] },
);
