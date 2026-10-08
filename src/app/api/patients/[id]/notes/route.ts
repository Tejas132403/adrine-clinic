import { authRoute, jsonOk, readJsonBody } from "@/server/http";
import { uuidSchema } from "@/server/validators/common";
import { clinicalNoteSchema } from "@/server/validators/note";
import { addClinicalNote, listClinicalNotes } from "@/server/services/note.service";

type Params = { id: string };

/** GET /api/patients/:id/notes - notes on a patient the caller may see. */
export const GET = authRoute<Params>(async ({ auth, params }) => {
  const patientId = uuidSchema.parse(params.id);
  const notes = await listClinicalNotes(auth, patientId);
  return jsonOk(notes);
});

/** POST /api/patients/:id/notes - doctors only, on their own visits. */
export const POST = authRoute<Params>(
  async ({ auth, params, request }) => {
    const patientId = uuidSchema.parse(params.id);
    const input = clinicalNoteSchema.parse(await readJsonBody(request));
    const note = await addClinicalNote(auth, patientId, input);
    return jsonOk(note, { status: 201 });
  },
  { roles: ["DOCTOR"] },
);
