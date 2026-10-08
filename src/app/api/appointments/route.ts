import { authRoute, jsonOk, queryParams, readJsonBody } from "@/server/http";
import { appointmentQuerySchema, appointmentSchema } from "@/server/validators/appointment";
import { createAppointment, listAppointments } from "@/server/services/appointment.service";

/**
 * GET /api/appointments?doctorId=&date=&status=&search=&page=&limit=
 * Doctors only ever receive their own schedule.
 */
export const GET = authRoute(async ({ request, auth }) => {
  const query = appointmentQuerySchema.parse(queryParams(request));
  const result = await listAppointments(auth, query);
  return jsonOk(result.items, { meta: result.meta });
});

/** POST /api/appointments - reception only; conflicts return 409. */
export const POST = authRoute(
  async ({ request, auth }) => {
    const input = appointmentSchema.parse(await readJsonBody(request));
    const appointment = await createAppointment(auth, input);
    return jsonOk(appointment, { status: 201 });
  },
  { roles: ["RECEPTIONIST"] },
);
