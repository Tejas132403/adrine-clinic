import { authRoute, jsonOk, readJsonBody } from "@/server/http";
import { patientPatchSchema, patientSchema } from "@/server/validators/patient";
import { getPatientById, updatePatient } from "@/server/services/patient.service";
import { uuidSchema } from "@/server/validators/common";

type Params = { id: string };

/** GET /api/patients/:id - profile with appointment history and clinical notes. */
export const GET = authRoute<Params>(async ({ auth, params }) => {
  const patientId = uuidSchema.parse(params.id);
  const patient = await getPatientById(auth, patientId);
  return jsonOk(patient);
});

/** PUT /api/patients/:id - full update (reception only). */
export const PUT = authRoute<Params>(
  async ({ auth, params, request }) => {
    const patientId = uuidSchema.parse(params.id);
    const input = patientSchema.parse(await readJsonBody(request));
    const patient = await updatePatient(auth, patientId, input);
    return jsonOk(patient);
  },
  { roles: ["RECEPTIONIST"] },
);

/** PATCH /api/patients/:id - partial update (reception only). */
export const PATCH = authRoute<Params>(
  async ({ auth, params, request }) => {
    const patientId = uuidSchema.parse(params.id);
    const existing = await getPatientById(auth, patientId);
    const patch = patientPatchSchema.parse(await readJsonBody(request));
    const patient = await updatePatient(auth, patientId, {
      firstName: patch.firstName ?? existing.firstName,
      lastName: patch.lastName ?? existing.lastName,
      dateOfBirth: patch.dateOfBirth ?? existing.dateOfBirth,
      gender: patch.gender ?? existing.gender,
      phone: patch.phone ?? existing.phone,
      email: patch.email === undefined ? existing.email : patch.email,
      address: patch.address === undefined ? existing.address : patch.address,
      status: patch.status ?? existing.status,
    });
    return jsonOk(patient);
  },
  { roles: ["RECEPTIONIST"] },
);
