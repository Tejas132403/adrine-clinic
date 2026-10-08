import { authRoute, jsonOk, queryParams } from "@/server/http";
import { availabilityQuerySchema } from "@/server/validators/appointment";
import { getDoctorAvailability } from "@/server/services/appointment.service";

/**
 * GET /api/appointments/availability?doctorId=&date=&excludeAppointmentId=
 * Booked slots for one doctor on one day, so the form can warn before submit.
 */
export const GET = authRoute(async ({ request, auth }) => {
  const query = availabilityQuerySchema.parse(queryParams(request));
  const slots = await getDoctorAvailability(auth, query);
  return jsonOk(slots);
});
