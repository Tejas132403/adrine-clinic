import { authRoute, jsonOk, queryParams, readJsonBody } from "@/server/http";
import { patientQuerySchema, patientSchema } from "@/server/validators/patient";
import { createPatient, listPatients } from "@/server/services/patient.service";

/**
 * GET /api/patients?page=&limit=&search=&status=&sortBy=&sortOrder=
 * Doctors receive only the patients they have appointments with (see
 * src/server/auth/access.ts).
 */
export const GET = authRoute(async ({ request, auth }) => {
  const query = patientQuerySchema.parse(queryParams(request));
  const result = await listPatients(auth, query);
  return jsonOk(result.items, { meta: result.meta });
});

/** POST /api/patients - reception only. */
export const POST = authRoute(
  async ({ request, auth }) => {
    const input = patientSchema.parse(await readJsonBody(request));
    const patient = await createPatient(auth, input);
    return jsonOk(patient, { status: 201 });
  },
  { roles: ["RECEPTIONIST"] },
);
