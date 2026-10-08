/**
 * End-to-end API verification.
 *
 *   npm run verify            (the Next.js dev server must be running)
 *   VERIFY_BASE_URL=http://localhost:3000/api npm run verify
 *
 * Exercises the assessment checklist against the real PostgreSQL database:
 * authentication, role authorization, the doctor-scoped patient rule, CRUD,
 * search / filter / sort / pagination, appointment conflict detection, the
 * appointment state machine and clinical notes.
 *
 * The script creates a small amount of test data and cleans it up (cancels its
 * appointments, archives its patient). Run `npm run db:seed` to reset the demo
 * data completely.
 */

const BASE_URL = process.env.VERIFY_BASE_URL ?? "http://localhost:3000/api";
const DEMO_PASSWORD = "Password123!";

type Json = Record<string, unknown>;

type ApiCall = {
  status: number;
  body: Json | null;
};

type Outcome = { area: string; name: string; ok: boolean; detail?: string };

const outcomes: Outcome[] = [];
let currentArea = "";

function area(name: string): void {
  currentArea = name;
}

async function check(name: string, run: () => Promise<void>): Promise<void> {
  try {
    await run();
    outcomes.push({ area: currentArea, name, ok: true });
    process.stdout.write(".");
  } catch (error) {
    outcomes.push({
      area: currentArea,
      name,
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    });
    process.stdout.write("x");
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEqual<T>(actual: T, expected: T, label: string): void {
  if (actual !== expected) throw new Error(`${label}: expected ${String(expected)}, received ${String(actual)}`);
}

function dataOf<T>(call: ApiCall): T {
  assert(call.body && typeof call.body === "object", `Response body was not an object (status ${call.status})`);
  assert("data" in call.body, `Response did not contain data (status ${call.status})`);
  return call.body.data as T;
}

function metaOf<T>(call: ApiCall): T {
  assert(call.body && "meta" in call.body, "Response did not contain pagination meta");
  return (call.body as { meta: T }).meta;
}

function messageOf(call: ApiCall): string {
  if (!call.body || typeof call.body.message !== "string") return "";
  return call.body.message;
}

function fieldErrorsOf(call: ApiCall): Record<string, string[]> {
  if (!call.body || typeof call.body.errors !== "object" || call.body.errors === null) return {};
  return call.body.errors as Record<string, string[]>;
}

async function call(
  method: "GET" | "POST" | "PUT" | "PATCH",
  path: string,
  options: { token?: string; body?: unknown } = {},
): Promise<ApiCall> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const text = await response.text();
  let body: Json | null = null;
  if (text) {
    try {
      body = JSON.parse(text) as Json;
    } catch {
      body = { raw: text };
    }
  }
  return { status: response.status, body };
}

/* ------------------------------- fixtures -------------------------------- */

type Session = { token: string; user: { id: string; role: string; name: string; doctorId: string | null } };

async function login(email: string): Promise<Session> {
  const response = await call("POST", "/auth/login", { body: { email, password: DEMO_PASSWORD } });
  assertEqual(response.status, 200, `login ${email}`);
  return dataOf<{ token: string; user: Session["user"] }>(response) as unknown as Session;
}

function isoDate(offsetDays = 0): string {
  const now = new Date();
  const date = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

function minutesToTime(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

/** 30-minute booking slots the verification run may use for today. */
const SLOT_POOL = [
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30",
];

type PatientList = Array<{ id: string; firstName: string; lastName: string; status: string; phone: string }>;
type AppointmentList = Array<{
  id: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  status: string;
  reason: string;
  patient: { id: string; firstName: string; lastName: string };
  doctor: { id: string; name: string };
}>;

const createdAppointmentIds: string[] = [];
let createdPatientId: string | null = null;
let createdPatientName = "";

/* --------------------------------- run ----------------------------------- */

async function main(): Promise<void> {
  console.log(`Verifying against ${BASE_URL}\n`);

  const reception = await login("reception@clinic.com");
  const doctor = await login("doctor@clinic.com");

  area("Authentication");
  await check("rejects a wrong password with 401", async () => {
    const response = await call("POST", "/auth/login", {
      body: { email: "reception@clinic.com", password: "wrong-password" },
    });
    assertEqual(response.status, 401, "status");
  });
  await check("rejects an unknown email with 401", async () => {
    const response = await call("POST", "/auth/login", {
      body: { email: "nobody@clinic.com", password: DEMO_PASSWORD },
    });
    assertEqual(response.status, 401, "status");
  });
  await check("validates the login payload", async () => {
    const response = await call("POST", "/auth/login", { body: { email: "not-an-email", password: "x" } });
    assertEqual(response.status, 400, "status");
    assert(fieldErrorsOf(response).email !== undefined, "expected an email field error");
  });
  await check("returns the signed-in user from /auth/me", async () => {
    const response = await call("GET", "/auth/me", { token: reception.token });
    assertEqual(response.status, 200, "status");
    const { user } = dataOf<{ user: { email: string; role: string } }>(response);
    assertEqual(user.role, "RECEPTIONIST", "role");
  });
  await check("rejects a missing token with 401", async () => {
    assertEqual((await call("GET", "/patients")).status, 401, "status");
  });
  await check("rejects a malformed token with 401", async () => {
    assertEqual((await call("GET", "/patients", { token: "not-a-jwt" })).status, 401, "status");
  });

  area("Authorization");
  await check("doctor cannot create a patient (403)", async () => {
    const response = await call("POST", "/patients", {
      token: doctor.token,
      body: {
        firstName: "Blocked",
        lastName: "Doctor",
        dateOfBirth: "1990-01-01",
        gender: "MALE",
        phone: "+91 90000 11111",
        status: "ACTIVE",
      },
    });
    assertEqual(response.status, 403, "status");
  });
  await check("doctor cannot create an appointment (403)", async () => {
    const response = await call("POST", "/appointments", {
      token: doctor.token,
      body: {
        patientId: "11111111-1111-1111-1111-111111111111",
        doctorId: "11111111-1111-1111-1111-111111111111",
        appointmentDate: isoDate(1),
        startTime: "09:00",
        endTime: "09:30",
        reason: "Should be blocked",
      },
    });
    assertEqual(response.status, 403, "status");
  });
  await check("doctor cannot cancel an appointment (403)", async () => {
    const list = await call("GET", "/appointments?limit=1", { token: reception.token });
    const [appointment] = dataOf<AppointmentList>(list);
    assert(appointment, "expected at least one appointment to exist");
    const response = await call("PATCH", `/appointments/${appointment.id}/cancel`, { token: doctor.token });
    assertEqual(response.status, 403, "status");
  });
  await check("reception cannot add a clinical note (403)", async () => {
    const list = await call("GET", "/appointments?limit=1", { token: reception.token });
    const [appointment] = dataOf<AppointmentList>(list);
    assert(appointment, "expected at least one appointment to exist");
    const response = await call("POST", `/patients/${appointment.patient.id}/notes`, {
      token: reception.token,
      body: { appointmentId: appointment.id, note: "Reception should not be able to write this." },
    });
    assertEqual(response.status, 403, "status");
  });

  area("Doctor patient visibility");
  await check("doctor sees fewer patients than reception", async () => {
    const receptionList = await call("GET", "/patients?limit=1", { token: reception.token });
    const doctorList = await call("GET", "/patients?limit=1", { token: doctor.token });
    const receptionTotal = metaOf<{ total: number }>(receptionList).total;
    const doctorTotal = metaOf<{ total: number }>(doctorList).total;
    assert(
      doctorTotal < receptionTotal,
      `expected the doctor to see fewer patients (doctor ${doctorTotal}, reception ${receptionTotal})`,
    );
  });
  await check("doctor patient list only contains patients they have appointments with", async () => {
    const list = await call("GET", "/patients?limit=100", { token: doctor.token });
    const patients = dataOf<PatientList>(list);
    const appointments = dataOf<AppointmentList>(
      await call("GET", `/appointments?limit=100&doctorId=${doctor.user.doctorId}`, { token: reception.token }),
    );
    const linked = new Set(appointments.map((appointment) => appointment.patient.id));
    const unlinked = patients.filter((patient) => !linked.has(patient.id));
    assertEqual(unlinked.length, 0, `patients returned without a visit (${unlinked.map((p) => p.lastName).join(", ")})`);
  });
  await check("doctor cannot open the profile of an unlinked patient (404)", async () => {
    // A patient registered without any appointment (present in the seed data).
    const search = await call("GET", "/patients?search=Bhatia&limit=5", { token: reception.token });
    const [unlinkedPatient] = dataOf<PatientList>(search);
    assert(unlinkedPatient, "expected the seeded unlinked patient to exist");
    assertEqual((await call("GET", `/patients/${unlinkedPatient.id}`, { token: doctor.token })).status, 404, "status");
    assertEqual((await call("GET", `/patients/${unlinkedPatient.id}`, { token: reception.token })).status, 200, "status");
  });
  await check("doctor cannot read notes for an unlinked patient (404)", async () => {
    const search = await call("GET", "/patients?search=Bhatia&limit=5", { token: reception.token });
    const [unlinkedPatient] = dataOf<PatientList>(search);
    assert(unlinkedPatient, "expected the seeded unlinked patient to exist");
    assertEqual((await call("GET", `/patients/${unlinkedPatient.id}/notes`, { token: doctor.token })).status, 404, "status");
  });

  area("Patients");
  await check("creates a patient", async () => {
    // Letters only: the name validator correctly rejects digits.
    const suffix = Array.from({ length: 5 }, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join("");
    createdPatientName = `Verif${suffix}`;
    const response = await call("POST", "/patients", {
      token: reception.token,
      body: {
        firstName: createdPatientName,
        lastName: "Verification",
        dateOfBirth: "1992-05-14",
        gender: "FEMALE",
        phone: `+91 9000${Date.now().toString().slice(-6)}`,
        email: "verify.patient@example.com",
        address: "12 Test Lane, Pune, Maharashtra",
        status: "ACTIVE",
      },
    });
    assertEqual(response.status, 201, `status (${messageOf(response)})`);
    createdPatientId = dataOf<{ id: string }>(response).id;
  });
  await check("rejects a duplicate phone number with 409", async () => {
    assert(createdPatientId, "patient fixture missing");
    const existing = dataOf<{ phone: string }>(await call("GET", `/patients/${createdPatientId}`, { token: reception.token }));
    const response = await call("POST", "/patients", {
      token: reception.token,
      body: {
        firstName: "Duplicate",
        lastName: "Phone",
        dateOfBirth: "1980-03-03",
        gender: "MALE",
        phone: existing.phone,
        status: "ACTIVE",
      },
    });
    assertEqual(response.status, 409, "status");
  });
  await check("validates patient input with field errors", async () => {
    const response = await call("POST", "/patients", {
      token: reception.token,
      body: {
        firstName: "A",
        lastName: "B",
        dateOfBirth: "2999-01-01",
        gender: "MALE",
        phone: "12",
        email: "not-an-email",
      },
    });
    assertEqual(response.status, 400, "status");
    const errors = fieldErrorsOf(response);
    assert(errors.firstName && errors.lastName && errors.dateOfBirth && errors.phone && errors.email, "expected field errors for every invalid field");
  });
  await check("updates a patient (PUT)", async () => {
    assert(createdPatientId, "patient fixture missing");
    const response = await call("PUT", `/patients/${createdPatientId}`, {
      token: reception.token,
      body: {
        firstName: createdPatientName,
        lastName: "Verification",
        dateOfBirth: "1992-05-14",
        gender: "FEMALE",
        phone: dataOf<{ phone: string }>(await call("GET", `/patients/${createdPatientId}`, { token: reception.token })).phone,
        email: "verify.patient@example.com",
        address: "44 Updated Road, Pune, Maharashtra",
        status: "INACTIVE",
      },
    });
    assertEqual(response.status, 200, `status (${messageOf(response)})`);
    const patient = dataOf<{ address: string; status: string }>(response);
    assertEqual(patient.address, "44 Updated Road, Pune, Maharashtra", "address");
    assertEqual(patient.status, "INACTIVE", "status");
  });
  await check("partially updates a patient (PATCH)", async () => {
    assert(createdPatientId, "patient fixture missing");
    const response = await call("PATCH", `/patients/${createdPatientId}`, {
      token: reception.token,
      body: { status: "ACTIVE" },
    });
    assertEqual(response.status, 200, "status");
    assertEqual(dataOf<{ status: string }>(response).status, "ACTIVE", "status value");
  });
  await check("searches patients by partial name", async () => {
    const response = await call("GET", `/patients?search=${createdPatientName.slice(0, 5)}&limit=20`, {
      token: reception.token,
    });
    const patients = dataOf<PatientList>(response);
    assert(
      patients.some((patient) => patient.id === createdPatientId),
      "search did not return the newly created patient",
    );
  });
  await check("filters patients by status", async () => {
    for (const status of ["ACTIVE", "INACTIVE", "ARCHIVED"] as const) {
      const response = await call("GET", `/patients?status=${status}&limit=100`, { token: reception.token });
      const patients = dataOf<PatientList>(response);
      const wrong = patients.filter((patient) => patient.status !== status);
      assertEqual(wrong.length, 0, `patients with a different status returned for ${status}`);
    }
  });
  await check("sorts patients by last name", async () => {
    const response = await call("GET", "/patients?sortBy=lastName&sortOrder=asc&limit=50", { token: reception.token });
    const patients = dataOf<PatientList>(response);
    const names = patients.map((patient) => patient.lastName.toLowerCase());
    const sorted = [...names].sort((a, b) => a.localeCompare(b));
    assertEqual(names.join("|"), sorted.join("|"), "last name order");
  });
  await check("paginates patients", async () => {
    const first = await call("GET", "/patients?limit=5&page=1", { token: reception.token });
    const second = await call("GET", "/patients?limit=5&page=2", { token: reception.token });
    const firstPage = dataOf<PatientList>(first);
    const secondPage = dataOf<PatientList>(second);
    assertEqual(firstPage.length, 5, "page size");
    const meta = metaOf<{ page: number; totalPages: number; total: number }>(second);
    assertEqual(meta.page, 2, "page number");
    assert(meta.totalPages >= 2, "expected more than one page of patients");
    const overlap = firstPage.filter((patient) => secondPage.some((other) => other.id === patient.id));
    assertEqual(overlap.length, 0, "pages overlap");
  });
  await check("validates pagination parameters", async () => {
    assertEqual((await call("GET", "/patients?page=0", { token: reception.token })).status, 400, "page=0");
    assertEqual((await call("GET", "/patients?limit=1000", { token: reception.token })).status, 400, "limit=1000");
    assertEqual((await call("GET", "/patients?status=DELETED", { token: reception.token })).status, 400, "unknown status");
  });
  await check("returns a profile with history and notes", async () => {
    const list = await call("GET", "/patients?limit=1&sortBy=createdAt&sortOrder=desc", { token: reception.token });
    const [patient] = dataOf<PatientList>(list);
    assert(patient, "expected a patient");
    const response = await call("GET", `/patients/${patient.id}`, { token: reception.token });
    assertEqual(response.status, 200, "status");
    const detail = dataOf<{ appointments: unknown[]; clinicalNotes: unknown[] }>(response);
    assert(Array.isArray(detail.appointments), "expected appointment history");
    assert(Array.isArray(detail.clinicalNotes), "expected clinical notes");
  });
  await check("refuses to archive a patient with upcoming appointments (409)", async () => {
    const upcoming = dataOf<AppointmentList>(
      await call("GET", "/appointments?status=SCHEDULED&sortOrder=desc&limit=1", { token: reception.token }),
    );
    const [appointment] = upcoming;
    assert(appointment, "expected a scheduled appointment");
    const profile = dataOf<{
      firstName: string;
      lastName: string;
      dateOfBirth: string;
      gender: string;
      phone: string;
      email: string | null;
      address: string | null;
    }>(await call("GET", `/patients/${appointment.patient.id}`, { token: reception.token }));

    const response = await call("PUT", `/patients/${appointment.patient.id}`, {
      token: reception.token,
      body: { ...profile, status: "ARCHIVED" },
    });
    assertEqual(response.status, 409, `status (${messageOf(response)})`);
  });
  await check("returns 404 for an unknown patient id", async () => {
    assertEqual(
      (await call("GET", "/patients/11111111-1111-1111-1111-111111111111", { token: reception.token })).status,
      404,
      "status",
    );
  });
  await check("returns 400 for a malformed patient id", async () => {
    assertEqual((await call("GET", "/patients/not-a-uuid", { token: reception.token })).status, 400, "status");
  });

  await verifyAppointments(reception, doctor);
  await verifyNotes(reception, doctor);
  await verifyDashboard(reception, doctor);
  await cleanup(reception);

  report();
}

/* ----------------------------- appointments ------------------------------ */

async function verifyAppointments(reception: Session, doctor: Session): Promise<void> {
  const doctorId = doctor.user.doctorId;
  assert(doctorId, "the seeded doctor account has no doctor record");

  // A patient this doctor already has a visit with (so notes can be added later).
  const doctorPatients = dataOf<PatientList>(
    await call("GET", "/patients?limit=1", { token: doctor.token }),
  );
  const patient = doctorPatients[0];
  assert(patient, "expected the doctor to have at least one patient");

  const today = isoDate(0);
  const base = {
    patientId: patient.id,
    doctorId,
    appointmentDate: today,
    reason: "Verification appointment",
  };

  // Pick genuinely free slots from the real availability endpoint, so the run
  // stays correct no matter what previous runs left behind.
  const booked = dataOf<Array<{ startTime: string; endTime: string }>>(
    await call("GET", `/appointments/availability?doctorId=${doctorId}&date=${today}`, { token: reception.token }),
  );
  const isFree = (start: string, minutes = 30): boolean => {
    const from = timeToMinutes(start);
    const to = from + minutes;
    return !booked.some((slot) => from < timeToMinutes(slot.endTime) && to > timeToMinutes(slot.startTime));
  };
  const pairIndex = SLOT_POOL.findIndex(
    (start, index) =>
      index + 1 < SLOT_POOL.length &&
      isFree(start) &&
      isFree(SLOT_POOL[index + 1] as string) &&
      timeToMinutes(SLOT_POOL[index + 1] as string) === timeToMinutes(start) + 30,
  );
  assert(
    pairIndex >= 0,
    `no free 30-minute slots left for today. Run \`npm run db:seed\` to reset the demo data.`,
  );
  const slot1 = SLOT_POOL[pairIndex] as string;
  const slot2 = SLOT_POOL[pairIndex + 1] as string;
  const extras = SLOT_POOL.filter(
    (start, index) => index !== pairIndex && index !== pairIndex + 1 && isFree(start),
  );
  const slot3 = extras[0];
  const slot4 = extras[1];
  assert(slot3 && slot4, "not enough free slots left for today. Run `npm run db:seed` to reset the demo data.");

  const endOf = (start: string, minutes = 30) => minutesToTime(timeToMinutes(start) + minutes);
  const overlapStart = minutesToTime(timeToMinutes(slot1) + 15);
  const overlapEnd = minutesToTime(timeToMinutes(slot1) + 45);

  let primaryId = "";
  let adjacentId = "";
  let futureId = "";

  area("Appointments");
  await check("creates an appointment", async () => {
    const response = await call("POST", "/appointments", {
      token: reception.token,
      body: { ...base, startTime: slot1, endTime: endOf(slot1) },
    });
    assertEqual(response.status, 201, `status (${messageOf(response)})`);
    primaryId = dataOf<{ id: string; status: string }>(response).id;
    createdAppointmentIds.push(primaryId);
    assertEqual(dataOf<{ status: string }>(response).status, "SCHEDULED", "created status");
  });
  await check("rejects an overlapping slot with 409 and a clear message", async () => {
    const response = await call("POST", "/appointments", {
      token: reception.token,
      body: { ...base, startTime: overlapStart, endTime: overlapEnd },
    });
    assertEqual(response.status, 409, `status (${messageOf(response)})`);
    assert(
      messageOf(response).includes("already has an appointment"),
      `expected an explanatory conflict message, received: ${messageOf(response)}`,
    );
    assert(fieldErrorsOf(response).startTime !== undefined, "expected a startTime field error");
  });
  await check("allows a back-to-back slot", async () => {
    const response = await call("POST", "/appointments", {
      token: reception.token,
      body: { ...base, startTime: slot2, endTime: endOf(slot2) },
    });
    assertEqual(response.status, 201, `status (${messageOf(response)})`);
    adjacentId = dataOf<{ id: string }>(response).id;
    createdAppointmentIds.push(adjacentId);
  });
  await check("rejects an end time before the start time", async () => {
    const response = await call("POST", "/appointments", {
      token: reception.token,
      body: { ...base, startTime: "13:30", endTime: "13:15" },
    });
    assertEqual(response.status, 400, "status");
    assert(fieldErrorsOf(response).endTime !== undefined, "expected an endTime field error");
  });
  await check("rejects a booking in the past", async () => {
    const response = await call("POST", "/appointments", {
      token: reception.token,
      body: { ...base, appointmentDate: isoDate(-3), startTime: "09:00", endTime: "09:30" },
    });
    assertEqual(response.status, 400, "status");
  });
  await check("rejects a booking outside clinic hours", async () => {
    const response = await call("POST", "/appointments", {
      token: reception.token,
      body: { ...base, startTime: "06:00", endTime: "06:30" },
    });
    assertEqual(response.status, 400, "status");
  });
  await check("rejects a booking for an archived patient", async () => {
    const archived = dataOf<PatientList>(
      await call("GET", "/patients?status=ARCHIVED&limit=1", { token: reception.token }),
    );
    const [archivedPatient] = archived;
    assert(archivedPatient, "expected a seeded archived patient");
    const response = await call("POST", "/appointments", {
      token: reception.token,
      body: { ...base, patientId: archivedPatient.id, startTime: slot4, endTime: endOf(slot4) },
    });
    assertEqual(response.status, 409, `status (${messageOf(response)})`);
  });
  await check("reports booked slots for a doctor and day", async () => {
    const response = await call(
      "GET",
      `/appointments/availability?doctorId=${doctorId}&date=${isoDate(0)}`,
      { token: reception.token },
    );
    assertEqual(response.status, 200, "status");
    const slots = dataOf<Array<{ startTime: string }>>(response);
    assert(
      slots.some((slot) => slot.startTime === slot1),
      `expected ${slot1} to be reported as booked`,
    );
  });
  await check("reschedules an appointment", async () => {
    const response = await call("PUT", `/appointments/${adjacentId}`, {
      token: reception.token,
      body: { ...base, startTime: slot3, endTime: endOf(slot3) },
    });
    assertEqual(response.status, 200, `status (${messageOf(response)})`);
    const updated = dataOf<{ startTime: string; endTime: string; status: string }>(response);
    assertEqual(updated.startTime, slot3, "start time");
    assertEqual(updated.status, "SCHEDULED", "status after reschedule");
  });
  await check("rejects a reschedule into a taken slot (409)", async () => {
    const response = await call("PUT", `/appointments/${adjacentId}`, {
      token: reception.token,
      body: { ...base, startTime: overlapStart, endTime: overlapEnd },
    });
    assertEqual(response.status, 409, `status (${messageOf(response)})`);
  });
  await check("rejects rescheduling a completed appointment (409)", async () => {
    const completed = dataOf<AppointmentList>(
      await call("GET", `/appointments?status=COMPLETED&doctorId=${doctorId}&limit=1`, { token: reception.token }),
    );
    const [appointment] = completed;
    assert(appointment, "expected a completed appointment in the seed data");
    const response = await call("PUT", `/appointments/${appointment.id}`, {
      token: reception.token,
      body: {
        ...base,
        patientId: appointment.patient.id,
        appointmentDate: appointment.appointmentDate,
        startTime: slot4,
        endTime: endOf(slot4),
      },
    });
    assertEqual(response.status, 409, `status (${messageOf(response)})`);
  });
  await check("cancels an appointment", async () => {
    const response = await call("PATCH", `/appointments/${adjacentId}/cancel`, { token: reception.token });
    assertEqual(response.status, 200, `status (${messageOf(response)})`);
    assertEqual(dataOf<{ status: string }>(response).status, "CANCELLED", "status");
  });
  await check("rejects cancelling twice (409)", async () => {
    const response = await call("PATCH", `/appointments/${adjacentId}/cancel`, { token: reception.token });
    assertEqual(response.status, 409, `status (${messageOf(response)})`);
  });
  await check("rejects completing a cancelled appointment (409)", async () => {
    const response = await call("PATCH", `/appointments/${adjacentId}/complete`, { token: reception.token });
    assertEqual(response.status, 409, `status (${messageOf(response)})`);
  });
  await check("completes today's appointment", async () => {
    const created = await call("POST", "/appointments", {
      token: reception.token,
      body: { ...base, startTime: slot4, endTime: endOf(slot4) },
    });
    assertEqual(created.status, 201, `create status (${messageOf(created)})`);
    const appointmentId = dataOf<{ id: string }>(created).id;
    createdAppointmentIds.push(appointmentId);

    const response = await call("PATCH", `/appointments/${appointmentId}/complete`, { token: reception.token });
    assertEqual(response.status, 200, `status (${messageOf(response)})`);
    assertEqual(dataOf<{ status: string }>(response).status, "COMPLETED", "status");
  });
  await check("rejects completing a future appointment (409)", async () => {
    const created = await call("POST", "/appointments", {
      token: reception.token,
      body: { ...base, appointmentDate: isoDate(2), startTime: "09:00", endTime: "09:30" },
    });
    assertEqual(created.status, 201, `create status (${messageOf(created)})`);
    futureId = dataOf<{ id: string }>(created).id;
    createdAppointmentIds.push(futureId);

    const response = await call("PATCH", `/appointments/${futureId}/complete`, { token: reception.token });
    assertEqual(response.status, 409, `status (${messageOf(response)})`);
  });
  await check("filters appointments by date, status and doctor", async () => {
    const today = isoDate(0);
    const byDate = dataOf<AppointmentList>(
      await call("GET", `/appointments?date=${today}&limit=100`, { token: reception.token }),
    );
    assertEqual(byDate.filter((item) => item.appointmentDate !== today).length, 0, "date filter");

    const byStatus = dataOf<AppointmentList>(
      await call("GET", "/appointments?status=CANCELLED&limit=100", { token: reception.token }),
    );
    assertEqual(byStatus.filter((item) => item.status !== "CANCELLED").length, 0, "status filter");

    const byDoctor = dataOf<AppointmentList>(
      await call("GET", `/appointments?doctorId=${doctorId}&limit=100`, { token: reception.token }),
    );
    assertEqual(byDoctor.filter((item) => item.doctor.id !== doctorId).length, 0, "doctor filter");
    assert(byDoctor.length > 0, "expected appointments for the doctor");
  });
  await check("searches appointments by patient name", async () => {
    const response = await call("GET", `/appointments?search=${patient.lastName}&limit=50`, {
      token: reception.token,
    });
    const appointments = dataOf<AppointmentList>(response);
    assert(appointments.length > 0, "expected search results");
    assert(
      appointments.some((item) => item.patient.id === patient.id),
      "search did not include the expected patient",
    );
  });
  await check("doctor only ever receives their own appointments", async () => {
    const response = await call("GET", "/appointments?limit=100", { token: doctor.token });
    const appointments = dataOf<AppointmentList>(response);
    assert(appointments.length > 0, "expected the doctor to have appointments in the seed data");
    const foreign = appointments.filter((item) => item.doctor.id !== doctorId);
    assertEqual(foreign.length, 0, "appointments belonging to another doctor");
  });
  await check("returns 404 for an unknown appointment", async () => {
    assertEqual(
      (await call("GET", "/appointments/11111111-1111-1111-1111-111111111111", { token: reception.token })).status,
      404,
      "status",
    );
  });
}

/* ------------------------------- notes ---------------------------------- */

async function verifyNotes(reception: Session, doctor: Session): Promise<void> {
  const doctorId = doctor.user.doctorId;
  assert(doctorId, "the seeded doctor account has no doctor record");

  const doctorPatients = dataOf<PatientList>(await call("GET", "/patients?limit=2", { token: doctor.token }));
  const patient = doctorPatients[0];
  const otherPatient = doctorPatients[1];
  assert(patient && otherPatient, "expected the doctor to have at least two patients");

  const ownAppointment = dataOf<AppointmentList>(
    await call("GET", `/appointments?patientId=${patient.id}&limit=20`, { token: doctor.token }),
  ).find((item) => item.status !== "CANCELLED");
  assert(ownAppointment, "expected a non-cancelled appointment between the doctor and their patient");

  const foreignAppointment = dataOf<AppointmentList>(
    await call("GET", "/appointments?limit=100", { token: reception.token }),
  ).find((item) => item.doctor.id !== doctorId);

  let noteId = "";

  area("Clinical notes");
  await check("doctor adds a clinical note", async () => {
    const response = await call("POST", `/patients/${patient.id}/notes`, {
      token: doctor.token,
      body: {
        appointmentId: ownAppointment.id,
        note: "Verification note: vitals stable, advised hydration and review in one week.",
      },
    });
    assertEqual(response.status, 201, `status (${messageOf(response)})`);
    const note = dataOf<{ id: string; doctor: { id: string; name: string }; note: string }>(response);
    noteId = note.id;
    assertEqual(note.doctor.id, doctorId, "note author");
  });
  await check("rejects a note without an appointment (400)", async () => {
    const response = await call("POST", `/patients/${patient.id}/notes`, {
      token: doctor.token,
      body: { note: "Missing appointment id" },
    });
    assertEqual(response.status, 400, "status");
  });
  await check("rejects a note on another doctor's appointment (403)", async () => {
    assert(foreignAppointment, "expected an appointment belonging to another doctor");
    const response = await call("POST", `/patients/${foreignAppointment.patient.id}/notes`, {
      token: doctor.token,
      body: { appointmentId: foreignAppointment.id, note: "Should not be accepted." },
    });
    // Either the patient is out of scope (404) or the appointment is not theirs (403).
    assert(
      response.status === 403 || response.status === 404,
      `expected 403/404, received ${response.status} (${messageOf(response)})`,
    );
    if (response.status === 403) {
      assert(messageOf(response).includes("own appointments"), "expected an ownership message");
    }
  });
  await check("rejects a note when the appointment belongs to another patient (400)", async () => {
    const response = await call("POST", `/patients/${otherPatient.id}/notes`, {
      token: doctor.token,
      body: { appointmentId: ownAppointment.id, note: "Mismatched patient and appointment." },
    });
    assertEqual(response.status, 400, `status (${messageOf(response)})`);
  });
  await check("rejects a note on a cancelled appointment (409)", async () => {
    const futureId = createdAppointmentIds[createdAppointmentIds.length - 1];
    assert(futureId, "expected the future appointment fixture");
    const cancelled = await call("PATCH", `/appointments/${futureId}/cancel`, { token: reception.token });
    assertEqual(cancelled.status, 200, `cancel status (${messageOf(cancelled)})`);

    const response = await call("POST", `/patients/${patient.id}/notes`, {
      token: doctor.token,
      body: { appointmentId: futureId, note: "Should not be accepted on a cancelled visit." },
    });
    assertEqual(response.status, 409, `status (${messageOf(response)})`);
  });
  await check("reception can read the note in the patient profile", async () => {
    const response = await call("GET", `/patients/${patient.id}`, { token: reception.token });
    const detail = dataOf<{ clinicalNotes: Array<{ id: string }> }>(response);
    assert(
      detail.clinicalNotes.some((note) => note.id === noteId),
      "the new note did not appear in the patient profile",
    );
  });
}

/* ------------------------------ dashboard -------------------------------- */

async function verifyDashboard(reception: Session, doctor: Session): Promise<void> {
  const doctorId = doctor.user.doctorId;
  assert(doctorId, "the seeded doctor account has no doctor record");
  const today = isoDate(0);

  area("Dashboard");
  await check("reception dashboard totals match the patient list", async () => {
    const response = await call("GET", "/dashboard/stats", { token: reception.token });
    assertEqual(response.status, 200, "status");
    const stats = dataOf<{
      scope: string;
      totalPatients: number;
      activity: Array<{ date: string }>;
      todaySchedule: Array<{ appointmentDate: string }>;
      todayByStatus: Record<string, number>;
      todayAppointments: number;
    }>(response);

    assertEqual(stats.scope, "RECEPTIONIST", "scope");
    assertEqual(stats.activity.length, 7, "activity points");
    assertEqual(stats.todaySchedule.filter((item) => item.appointmentDate !== today).length, 0, "today schedule dates");
    assertEqual(
      stats.todayByStatus.SCHEDULED + stats.todayByStatus.COMPLETED,
      stats.todayAppointments,
      "today total",
    );

    const meta = metaOf<{ total: number }>(await call("GET", "/patients?limit=1", { token: reception.token }));
    assertEqual(stats.totalPatients, meta.total, "total patients");
  });
  await check("dashboard activity reflects real appointments", async () => {
    const response = await call("GET", "/dashboard/stats", { token: reception.token });
    const stats = dataOf<{ activity: Array<{ total: number }> }>(response);
    const total = stats.activity.reduce((sum, point) => sum + point.total, 0);
    assert(total > 0, "expected the last 7 days to contain appointments");
  });
  await check("doctor dashboard is scoped to their own work", async () => {
    const response = await call("GET", "/dashboard/stats", { token: doctor.token });
    assertEqual(response.status, 200, "status");
    const stats = dataOf<{
      scope: string;
      totalPatients: number;
      todaySchedule: Array<{ doctor: { id: string } }>;
    }>(response);

    assertEqual(stats.scope, "DOCTOR", "scope");
    const foreign = stats.todaySchedule.filter((item) => item.doctor.id !== doctorId);
    assertEqual(foreign.length, 0, "appointments from other doctors on the doctor dashboard");

    const doctorPatients = metaOf<{ total: number }>(await call("GET", "/patients?limit=1", { token: doctor.token }));
    assertEqual(stats.totalPatients, doctorPatients.total, "doctor total patients");
  });
}

/* ------------------------------- cleanup --------------------------------- */

async function cleanup(reception: Session): Promise<void> {
  area("Cleanup");
  await check("test appointments are released", async () => {
    for (const appointmentId of createdAppointmentIds) {
      const response = await call("PATCH", `/appointments/${appointmentId}/cancel`, { token: reception.token });
      assert(
        response.status === 200 || response.status === 409,
        `unexpected status ${response.status} while cleaning up (${messageOf(response)})`,
      );
    }
  });
  await check("test patient is archived", async () => {
    const fallbackId = createdPatientId;
    assert(fallbackId, "no test patient to clean up");
    const profile = dataOf<{
      firstName: string;
      lastName: string;
      dateOfBirth: string;
      gender: string;
      phone: string;
      email: string | null;
      address: string | null;
    }>(await call("GET", `/patients/${fallbackId}`, { token: reception.token }));

    const response = await call("PUT", `/patients/${fallbackId}`, {
      token: reception.token,
      body: { ...profile, status: "ARCHIVED" },
    });
    assertEqual(response.status, 200, `status (${messageOf(response)})`);
  });
}

/* -------------------------------- report --------------------------------- */

function report(): void {
  const areas = [...new Set(outcomes.map((outcome) => outcome.area))];
  const failed = outcomes.filter((outcome) => !outcome.ok);

  console.log("\n");
  for (const name of areas) {
    const group = outcomes.filter((outcome) => outcome.area === name);
    const passed = group.filter((outcome) => outcome.ok).length;
    console.log(`${name} (${passed}/${group.length})`);
    for (const outcome of group) {
      console.log(`  ${outcome.ok ? "PASS" : "FAIL"}  ${outcome.name}`);
      if (!outcome.ok && outcome.detail) console.log(`        -> ${outcome.detail}`);
    }
  }

  console.log("\n---------------------------------------------");
  console.log(`${outcomes.length - failed.length}/${outcomes.length} checks passed`);
  if (failed.length > 0) {
    console.log(`${failed.length} failing check(s) - see details above.`);
    process.exit(1);
  }
  console.log("All API checks passed.");
}

export {};

void main();
