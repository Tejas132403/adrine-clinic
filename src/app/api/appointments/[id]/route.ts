import { authRoute, jsonOk, readJsonBody } from "@/server/http";
import { uuidSchema } from "@/server/validators/common";
import { appointmentSchema } from "@/server/validators/appointment";
import { getAppointmentById, updateAppointment } from "@/server/services/appointment.service";

type Params = { id: string };

/** GET /api/appointments/:id */
export const GET = authRoute<Params>(async ({ auth, params }) => {
  const appointment = await getAppointmentById(auth, uuidSchema.parse(params.id));
  return jsonOk(appointment);
});

/** PUT /api/appointments/:id - reschedule or correct a scheduled visit. */
export const PUT = authRoute<Params>(
  async ({ auth, params, request }) => {
    const input = appointmentSchema.parse(await readJsonBody(request));
    const appointment = await updateAppointment(auth, uuidSchema.parse(params.id), input);
    return jsonOk(appointment);
  },
  { roles: ["RECEPTIONIST"] },
);
