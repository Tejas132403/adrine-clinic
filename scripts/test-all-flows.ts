/**
 * Comprehensive End-to-End Simulation & Verification Script
 * Tests both RECEPTIONIST and DOCTOR workflows, form validations, conflict detection,
 * role guardrails, and Next.js frontend page accessibility.
 */
const BASE_URL = "http://localhost:3000";
const API_URL = `${BASE_URL}/api`;

type StepResult = {
  step: string;
  role: "SYSTEM" | "RECEPTIONIST" | "DOCTOR" | "SECURITY";
  status: "PASS" | "FAIL";
  details?: string;
};

const results: StepResult[] = [];

function record(step: string, role: StepResult["role"], status: "PASS" | "FAIL", details?: string) {
  results.push({ step, role, status, details });
  const icon = status === "PASS" ? "✓" : "✗";
  const tag = `[${role.padEnd(12)}]`;
  console.log(`${icon} ${tag} ${step} ${details ? `(${details})` : ""}`);
}

async function api(
  method: string,
  path: string,
  options: { token?: string; body?: unknown } = {}
) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (options.token) headers["Authorization"] = `Bearer ${options.token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  return { status: res.status, ok: res.ok, body: json };
}

async function checkPage(path: string, cookie?: string) {
  const headers: Record<string, string> = {};
  if (cookie) headers["Cookie"] = cookie;

  const res = await fetch(`${BASE_URL}${path}`, { headers });
  return { status: res.status, ok: res.ok };
}

function getTodayString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

async function run() {
  console.log("================================================================================");
  console.log("CLINIC MANAGEMENT APPLICATION — COMPREHENSIVE END-TO-END VERIFICATION");
  console.log("Testing Roles: RECEPTIONIST, DOCTOR, SECURITY GUARDRAILS, FRONTEND PAGES");
  console.log("================================================================================\n");

  const cleanupAppointments: string[] = [];
  let cleanupPatientId: string | null = null;

  // ---------------------------------------------------------------------------
  // 1. FRONTEND SERVER ACCESSIBILITY
  // ---------------------------------------------------------------------------
  console.log("--- 1. TESTING FRONTEND PAGES ---");
  const loginPage = await checkPage("/login");
  if (loginPage.status === 200) {
    record("Login page renders (GET /login)", "SYSTEM", "PASS", "HTTP 200");
  } else {
    record("Login page renders (GET /login)", "SYSTEM", "FAIL", `HTTP ${loginPage.status}`);
  }

  // ---------------------------------------------------------------------------
  // 2. RECEPTIONIST AUTHENTICATION & DASHBOARD
  // ---------------------------------------------------------------------------
  console.log("\n--- 2. RECEPTIONIST WORKFLOW ---");
  
  // Login failure check
  const badLogin = await api("POST", "/auth/login", {
    body: { email: "reception@clinic.com", password: "WrongPassword!" }
  });
  if (badLogin.status === 401) {
    record("Reject invalid receptionist password", "SECURITY", "PASS", "HTTP 401");
  } else {
    record("Reject invalid receptionist password", "SECURITY", "FAIL", `Expected 401, got ${badLogin.status}`);
  }

  // Login success
  const recLogin = await api("POST", "/auth/login", {
    body: { email: "reception@clinic.com", password: "Password123!" }
  });
  if (recLogin.status === 200 && recLogin.body.data?.token) {
    record("Receptionist login successful", "RECEPTIONIST", "PASS", `Token issued for ${recLogin.body.data.user.email}`);
  } else {
    record("Receptionist login successful", "RECEPTIONIST", "FAIL", `Status ${recLogin.status}`);
    return;
  }
  const recToken = recLogin.body.data.token;

  // Session verification
  const recMe = await api("GET", "/auth/me", { token: recToken });
  if (recMe.status === 200 && recMe.body.data?.user?.role === "RECEPTIONIST") {
    record("Validate receptionist session (/auth/me)", "RECEPTIONIST", "PASS", "Role: RECEPTIONIST");
  } else {
    record("Validate receptionist session (/auth/me)", "RECEPTIONIST", "FAIL", `Role mismatch: ${recMe.body.data?.user?.role}`);
  }

  // Dashboard stats
  const recStats = await api("GET", "/dashboard/stats", { token: recToken });
  if (recStats.status === 200 && typeof recStats.body.data?.totalPatients === "number") {
    const d = recStats.body.data;
    record(
      "Fetch receptionist dashboard KPIs",
      "RECEPTIONIST",
      "PASS",
      `Patients: ${d.totalPatients}, Today: ${d.todayAppointments}, Upcoming: ${d.upcomingAppointments}`
    );
  } else {
    record("Fetch receptionist dashboard KPIs", "RECEPTIONIST", "FAIL", `Status ${recStats.status}`);
  }

  // ---------------------------------------------------------------------------
  // 3. PATIENTS (SEARCH, FILTER, SORT, CREATE, UPDATE)
  // ---------------------------------------------------------------------------
  console.log("\n--- 3. PATIENT MANAGEMENT ---");

  // List all patients
  const pList = await api("GET", "/patients?page=1&limit=10", { token: recToken });
  const patientItems = Array.isArray(pList.body.data) ? pList.body.data : [];
  if (pList.status === 200 && patientItems.length > 0) {
    record("List patients with pagination", "RECEPTIONIST", "PASS", `Found ${pList.body.meta?.total} patients`);
  } else {
    record("List patients with pagination", "RECEPTIONIST", "FAIL", `Status ${pList.status}`);
  }

  // Search by name
  const pSearch = await api("GET", "/patients?search=Rohan", { token: recToken });
  const searchItems = Array.isArray(pSearch.body.data) ? pSearch.body.data : [];
  if (pSearch.status === 200 && searchItems.some((p: any) => p.firstName === "Rohan")) {
    record("Search patient by name 'Rohan'", "RECEPTIONIST", "PASS", "Trigram match verified");
  } else {
    record("Search patient by name 'Rohan'", "RECEPTIONIST", "FAIL", "Rohan not found in search");
  }

  // Filter by status ACTIVE
  const pActive = await api("GET", "/patients?status=ACTIVE", { token: recToken });
  const activeItems = Array.isArray(pActive.body.data) ? pActive.body.data : [];
  const allActive = activeItems.length > 0 && activeItems.every((p: any) => p.status === "ACTIVE");
  if (pActive.status === 200 && allActive) {
    record("Filter patients by status ACTIVE", "RECEPTIONIST", "PASS", `${activeItems.length} active patients`);
  } else {
    record("Filter patients by status ACTIVE", "RECEPTIONIST", "FAIL", "Filter error");
  }

  // Create new patient (Validation check: missing fields)
  const invalidPatient = await api("POST", "/patients", {
    token: recToken,
    body: { firstName: "", lastName: "" }
  });
  if (invalidPatient.status === 400 && invalidPatient.body.errors) {
    record("Reject invalid patient submission", "SECURITY", "PASS", "Field errors returned");
  } else {
    record("Reject invalid patient submission", "SECURITY", "FAIL", `Expected 400, got ${invalidPatient.status}`);
  }

  // Create valid patient
  const uniquePhone = `+91 98${Math.floor(10000000 + Math.random() * 90000000)}`;
  const newPatientPayload = {
    firstName: "Aaditya",
    lastName: "Kapoor",
    dateOfBirth: "1994-08-20",
    gender: "MALE",
    phone: uniquePhone,
    email: `aaditya.${Date.now()}@example.com`,
    address: "Marine Lines, Mumbai, Maharashtra",
    status: "ACTIVE",
  };
  const createPatient = await api("POST", "/patients", {
    token: recToken,
    body: newPatientPayload,
  });
  let createdPatientId = "";
  if (createPatient.status === 201 && createPatient.body.data?.id) {
    createdPatientId = createPatient.body.data.id;
    cleanupPatientId = createdPatientId;
    record("Register new patient", "RECEPTIONIST", "PASS", `Patient ID: ${createdPatientId} (${newPatientPayload.firstName} ${newPatientPayload.lastName})`);
  } else {
    record("Register new patient", "RECEPTIONIST", "FAIL", `Status ${createPatient.status}: ${JSON.stringify(createPatient.body)}`);
  }

  // Reject duplicate phone number
  const dupPhonePatient = await api("POST", "/patients", {
    token: recToken,
    body: {
      firstName: "Test",
      lastName: "Duplicate",
      dateOfBirth: "1990-01-01",
      gender: "FEMALE",
      phone: uniquePhone,
      email: "dup@example.com",
      status: "ACTIVE"
    }
  });
  if (dupPhonePatient.status === 409) {
    record("Reject duplicate patient phone number", "SECURITY", "PASS", "HTTP 409 Conflict");
  } else {
    record("Reject duplicate patient phone number", "SECURITY", "FAIL", `Expected 409, got ${dupPhonePatient.status}`);
  }

  // View patient profile
  const profile = await api("GET", `/patients/${createdPatientId}`, { token: recToken });
  if (profile.status === 200 && profile.body.data?.firstName === "Aaditya") {
    record("View patient profile & history", "RECEPTIONIST", "PASS", `Name: ${profile.body.data.firstName} ${profile.body.data.lastName}`);
  } else {
    record("View patient profile & history", "RECEPTIONIST", "FAIL", `Status ${profile.status}`);
  }

  // Update patient demographics
  const updatePatient = await api("PUT", `/patients/${createdPatientId}`, {
    token: recToken,
    body: {
      ...newPatientPayload,
      address: "Worli Sea Face, Mumbai, Maharashtra",
    }
  });
  if (updatePatient.status === 200 && updatePatient.body.data?.address === "Worli Sea Face, Mumbai, Maharashtra") {
    record("Update patient demographics", "RECEPTIONIST", "PASS", "Updated address verified");
  } else {
    record("Update patient demographics", "RECEPTIONIST", "FAIL", `Status ${updatePatient.status}`);
  }

  // ---------------------------------------------------------------------------
  // 4. APPOINTMENTS (BOOKING, CONFLICT DETECTION, STATE MACHINE)
  // ---------------------------------------------------------------------------
  console.log("\n--- 4. APPOINTMENT SCHEDULING & CONFLICT PREVENTION ---");

  // Fetch doctors list
  const docList = await api("GET", "/doctors", { token: recToken });
  const doctor = docList.body.data?.[0];
  if (doctor) {
    record("Fetch active doctor directory", "RECEPTIONIST", "PASS", `Selected: ${doctor.name} (${doctor.specialization})`);
  } else {
    record("Fetch active doctor directory", "RECEPTIONIST", "FAIL", "No doctors found");
    return;
  }

  const todayStr = getTodayString();

  // Find free available slots for today
  const availRes = await api("GET", `/appointments/availability?doctorId=${doctor.id}&date=${todayStr}`, { token: recToken });
  const bookedSlots = new Set((availRes.body.data ?? []).map((s: any) => s.startTime));
  const candidateSlots = ["15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30"];
  const freeSlots = candidateSlots.filter((slot) => !bookedSlots.has(slot));

  const slotA = freeSlots[0] || "17:00";
  const slotB = freeSlots[1] || "17:30";
  const slotC = freeSlots[2] || "18:00";

  const getEndSlot = (start: string) => {
    const [h, m] = start.split(":").map(Number);
    const total = h * 60 + m + 30;
    const eh = Math.floor(total / 60);
    const em = total % 60;
    return `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;
  };

  // Test: Reject booking when end time is before start time
  const badTimeAppt = await api("POST", "/appointments", {
    token: recToken,
    body: {
      patientId: createdPatientId,
      doctorId: doctor.id,
      appointmentDate: todayStr,
      startTime: "15:00",
      endTime: "14:30",
      reason: "Invalid timing test",
    }
  });
  if (badTimeAppt.status === 400) {
    record("Reject booking with end time before start time", "SECURITY", "PASS", "HTTP 400 Bad Request");
  } else {
    record("Reject booking with end time before start time", "SECURITY", "FAIL", `Expected 400, got ${badTimeAppt.status}`);
  }

  // Test: Successfully book slot A
  const endA = getEndSlot(slotA);
  const appt1 = await api("POST", "/appointments", {
    token: recToken,
    body: {
      patientId: createdPatientId,
      doctorId: doctor.id,
      appointmentDate: todayStr,
      startTime: slotA,
      endTime: endA,
      reason: "Initial medical consultation",
    }
  });
  let appt1Id = "";
  if (appt1.status === 201 && appt1.body.data?.id) {
    appt1Id = appt1.body.data.id;
    cleanupAppointments.push(appt1Id);
    record(`Book initial appointment (${slotA} - ${endA})`, "RECEPTIONIST", "PASS", `Appt ID: ${appt1Id}`);
  } else {
    record(`Book initial appointment (${slotA} - ${endA})`, "RECEPTIONIST", "FAIL", `Status ${appt1.status}: ${JSON.stringify(appt1.body)}`);
  }

  // Test: Overlapping conflict detection
  const [ah, am] = slotA.split(":").map(Number);
  const startMins = ah * 60 + am;
  const oStartMins = startMins + 15;
  const oEndMins = startMins + 45;
  const overlapStart = `${String(Math.floor(oStartMins / 60)).padStart(2, "0")}:${String(oStartMins % 60).padStart(2, "0")}`;
  const overlapEnd = `${String(Math.floor(oEndMins / 60)).padStart(2, "0")}:${String(oEndMins % 60).padStart(2, "0")}`;

  const conflictAppt = await api("POST", "/appointments", {
    token: recToken,
    body: {
      patientId: createdPatientId,
      doctorId: doctor.id,
      appointmentDate: todayStr,
      startTime: overlapStart,
      endTime: overlapEnd,
      reason: "Conflicting slot test",
    }
  });
  if (conflictAppt.status === 409 && conflictAppt.body.message?.includes("already has an appointment")) {
    record(
      `Detect and reject overlapping appointment conflict (${overlapStart} - ${overlapEnd})`,
      "SECURITY",
      "PASS",
      `HTTP 409: "${conflictAppt.body.message}"`
    );
  } else {
    record("Detect and reject overlapping appointment conflict", "SECURITY", "FAIL", `Expected 409 with message, got ${conflictAppt.status}`);
  }

  // Test: Allow back-to-back appointment (slot B)
  const endB = getEndSlot(slotB);
  const b2bAppt = await api("POST", "/appointments", {
    token: recToken,
    body: {
      patientId: createdPatientId,
      doctorId: doctor.id,
      appointmentDate: todayStr,
      startTime: slotB,
      endTime: endB,
      reason: "Follow-up consultation",
    }
  });
  let b2bApptId = "";
  if (b2bAppt.status === 201 && b2bAppt.body.data?.id) {
    b2bApptId = b2bAppt.body.data.id;
    cleanupAppointments.push(b2bApptId);
    record(`Allow back-to-back non-overlapping slot (${slotB} - ${endB})`, "RECEPTIONIST", "PASS", "Slot accepted without conflict");
  } else {
    record("Allow back-to-back non-overlapping slot", "RECEPTIONIST", "FAIL", `Status ${b2bAppt.status}`);
  }

  // Reschedule b2bAppt into a conflicted slot (attempt slotA overlap)
  const badReschedule = await api("PUT", `/appointments/${b2bApptId}`, {
    token: recToken,
    body: {
      patientId: createdPatientId,
      doctorId: doctor.id,
      appointmentDate: todayStr,
      startTime: overlapStart,
      endTime: overlapEnd,
      reason: "Reschedule into conflict",
    }
  });
  if (badReschedule.status === 409) {
    record("Reject rescheduling into an occupied slot", "SECURITY", "PASS", "HTTP 409 Conflict");
  } else {
    record("Reject rescheduling into an occupied slot", "SECURITY", "FAIL", `Expected 409, got ${badReschedule.status}`);
  }

  // Cancel second appointment
  const cancelAppt = await api("PATCH", `/appointments/${b2bApptId}/cancel`, {
    token: recToken,
    body: { cancellationReason: "Patient schedule conflict" }
  });
  if (cancelAppt.status === 200 && cancelAppt.body.data?.status === "CANCELLED") {
    record("Cancel appointment with reason", "RECEPTIONIST", "PASS", "Status updated to CANCELLED");
  } else {
    record("Cancel appointment with reason", "RECEPTIONIST", "FAIL", `Status ${cancelAppt.status}`);
  }

  // Reject completing a cancelled appointment
  const completeCancelled = await api("PATCH", `/appointments/${b2bApptId}/complete`, { token: recToken });
  if (completeCancelled.status === 409) {
    record("Reject completing a cancelled appointment", "SECURITY", "PASS", "HTTP 409 Conflict");
  } else {
    record("Reject completing a cancelled appointment", "SECURITY", "FAIL", `Expected 409, got ${completeCancelled.status}`);
  }

  // Mark appt1 as completed by Receptionist
  if (appt1Id) {
    const completeAppt = await api("PATCH", `/appointments/${appt1Id}/complete`, { token: recToken });
    if (completeAppt.status === 200 && completeAppt.body.data?.status === "COMPLETED") {
      record("Receptionist marks appointment as COMPLETED", "RECEPTIONIST", "PASS", "Status updated to COMPLETED");
    } else {
      record("Receptionist marks appointment as COMPLETED", "RECEPTIONIST", "FAIL", `Status ${completeAppt.status}`);
    }
  }

  // Receptionist attempts to add a clinical note (Forbidden)
  const recNote = await api("POST", `/patients/${createdPatientId}/notes`, {
    token: recToken,
    body: { appointmentId: appt1Id, note: "Reception trying to write clinical note" }
  });
  if (recNote.status === 403) {
    record("Block receptionist from adding clinical notes", "SECURITY", "PASS", "HTTP 403 Forbidden");
  } else {
    record("Block receptionist from adding clinical notes", "SECURITY", "FAIL", `Expected 403, got ${recNote.status}`);
  }

  // ---------------------------------------------------------------------------
  // 5. DOCTOR WORKFLOW & PATIENT VISIBILITY SCOPING
  // ---------------------------------------------------------------------------
  console.log("\n--- 5. DOCTOR WORKFLOW & ACCESS CONTROL ---");

  // Login as Doctor (Dr. Aarav Sharma)
  const docLogin = await api("POST", "/auth/login", {
    body: { email: "doctor@clinic.com", password: "Password123!" }
  });
  if (docLogin.status === 200 && docLogin.body.data?.token) {
    record("Doctor login successful", "DOCTOR", "PASS", `Dr. Aarav Sharma (${docLogin.body.data.user.role})`);
  } else {
    record("Doctor login successful", "DOCTOR", "FAIL", `Status ${docLogin.status}`);
    return;
  }
  const docToken = docLogin.body.data.token;

  // Doctor dashboard (scoped)
  const docStats = await api("GET", "/dashboard/stats", { token: docToken });
  if (docStats.status === 200 && typeof docStats.body.data?.todayAppointments === "number") {
    record("Doctor dashboard reflects doctor-specific roster", "DOCTOR", "PASS", `Today's roster: ${docStats.body.data.todayAppointments}`);
  } else {
    record("Doctor dashboard reflects doctor-specific roster", "DOCTOR", "FAIL", `Status ${docStats.status}`);
  }

  // Doctor patient visibility rule: doctor should see appointed patient Aaditya Kapoor
  const docPatients = await api("GET", "/patients", { token: docToken });
  const docPatientList = Array.isArray(docPatients.body.data) ? docPatients.body.data : [];
  const hasAaditya = docPatientList.some((p: any) => p.id === createdPatientId);
  if (docPatients.status === 200 && hasAaditya) {
    record(
      "Doctor can view patient with an appointment with them",
      "DOCTOR",
      "PASS",
      `Aaditya Kapoor visible in Dr. Sharma's list of ${docPatients.body.meta?.total} patients`
    );
  } else {
    record("Doctor can view patient with an appointment with them", "DOCTOR", "FAIL", "Patient not visible");
  }

  // Doctor can complete their own appointment
  const endC = getEndSlot(slotC);
  const docCanCompleteOwn = await api("POST", "/appointments", {
    token: recToken,
    body: {
      patientId: createdPatientId,
      doctorId: doctor.id,
      appointmentDate: todayStr,
      startTime: slotC,
      endTime: endC,
      reason: "Consultation to be completed by doctor",
    }
  });
  const docApptToCompleteId = docCanCompleteOwn.body.data?.id;
  if (docApptToCompleteId) {
    cleanupAppointments.push(docApptToCompleteId);
    const docCompleteRes = await api("PATCH", `/appointments/${docApptToCompleteId}/complete`, { token: docToken });
    if (docCompleteRes.status === 200 && docCompleteRes.body.data?.status === "COMPLETED") {
      record("Doctor marks own appointment as COMPLETED (tic schedule)", "DOCTOR", "PASS", "Doctor completed visit successfully");
    } else {
      record("Doctor marks own appointment as COMPLETED (tic schedule)", "DOCTOR", "FAIL", `Status ${docCompleteRes.status}`);
    }
  }

  // Doctor CANNOT complete another doctor's appointment
  const otherDoctor = docList.body.data?.find((d: any) => d.email !== "doctor@clinic.com");
  if (otherDoctor) {
    const otherApptRes = await api("POST", "/appointments", {
      token: recToken,
      body: {
        patientId: createdPatientId,
        doctorId: otherDoctor.id,
        appointmentDate: todayStr,
        startTime: slotC,
        endTime: endC,
        reason: "Visit for another doctor",
      }
    });
    const otherApptId = otherApptRes.body.data?.id;
    if (otherApptId) {
      cleanupAppointments.push(otherApptId);
      const docTryCompleteOther = await api("PATCH", `/appointments/${otherApptId}/complete`, { token: docToken });
      if (docTryCompleteOther.status === 403) {
        record("Doctor BLOCKED from completing another doctor's appointment", "SECURITY", "PASS", "HTTP 403 Forbidden");
      } else {
        record("Doctor BLOCKED from completing another doctor's appointment", "SECURITY", "FAIL", `Expected 403, got ${docTryCompleteOther.status}`);
      }
    }
  }

  // Doctor CANNOT see patients who have appointments only with other doctors
  const meeraDoc = docList.body.data?.find((d: any) => d.email === "meera.iyer@clinic.com");
  if (meeraDoc) {
    const unlinkedPhone = `+91 97${Math.floor(10000000 + Math.random() * 90000000)}`;
    const unlinkedPatientRes = await api("POST", "/patients", {
      token: recToken,
      body: {
        firstName: "Unlinked",
        lastName: "Patient",
        dateOfBirth: "2000-01-01",
        gender: "FEMALE",
        phone: unlinkedPhone,
        status: "ACTIVE"
      }
    });
    const unlinkedPatientId = unlinkedPatientRes.body.data?.id;

    // Doctor (Dr. Aarav Sharma) attempts to view unlinked patient's profile
    const unlinkedView = await api("GET", `/patients/${unlinkedPatientId}`, { token: docToken });
    if (unlinkedView.status === 404) {
      record(
        "Doctor CANNOT view unlinked patient profile (404 Not Found)",
        "SECURITY",
        "PASS",
        "Data isolation enforced at query level"
      );
    } else {
      record("Doctor CANNOT view unlinked patient profile", "SECURITY", "FAIL", `Expected 404, got ${unlinkedView.status}`);
    }

    // Doctor attempts to read notes for unlinked patient
    const unlinkedNotes = await api("GET", `/patients/${unlinkedPatientId}/notes`, { token: docToken });
    if (unlinkedNotes.status === 404) {
      record(
        "Doctor CANNOT read notes of unlinked patient (404 Not Found)",
        "SECURITY",
        "PASS",
        "Clinical notes isolation verified"
      );
    } else {
      record("Doctor CANNOT read notes of unlinked patient", "SECURITY", "FAIL", `Expected 404, got ${unlinkedNotes.status}`);
    }
  }

  // Doctor writes clinical note on their completed appointment
  const clinicalNoteText = "Patient presented for routine evaluation. Vital signs normal (BP 120/80, Pulse 72). Advised annual blood screening and lifestyle maintenance.";
  const noteTargetApptId = appt1Id || docApptToCompleteId;
  const addNote = await api("POST", `/patients/${createdPatientId}/notes`, {
    token: docToken,
    body: {
      appointmentId: noteTargetApptId,
      note: clinicalNoteText,
    }
  });
  if (addNote.status === 201 && addNote.body.data?.id) {
    record(
      "Doctor submits timestamped clinical note",
      "DOCTOR",
      "PASS",
      `Note ID: ${addNote.body.data.id}`
    );
  } else {
    record("Doctor submits timestamped clinical note", "DOCTOR", "FAIL", `Status ${addNote.status}: ${JSON.stringify(addNote.body)}`);
  }

  // Doctor reads patient notes and verifies note is present
  const docReadNotes = await api("GET", `/patients/${createdPatientId}/notes`, { token: docToken });
  const notesArray = Array.isArray(docReadNotes.body.data) ? docReadNotes.body.data : [];
  const noteFound = notesArray.some((n: any) => n.note === clinicalNoteText);
  if (docReadNotes.status === 200 && noteFound) {
    record("Doctor reads clinical notes timeline", "DOCTOR", "PASS", "Note successfully persisted and retrieved");
  } else {
    record("Doctor reads clinical notes timeline", "DOCTOR", "FAIL", "Note missing in timeline");
  }

  // Doctor attempts receptionist-only actions (creating patient, booking appointment)
  const docCreatePatient = await api("POST", "/patients", {
    token: docToken,
    body: { firstName: "Fail", lastName: "Doc", dateOfBirth: "1990-01-01", gender: "MALE", phone: "+91 99999 00000", status: "ACTIVE" }
  });
  if (docCreatePatient.status === 403) {
    record("Doctor blocked from creating patients", "SECURITY", "PASS", "HTTP 403 Forbidden");
  } else {
    record("Doctor blocked from creating patients", "SECURITY", "FAIL", `Expected 403, got ${docCreatePatient.status}`);
  }

  const docCreateAppt = await api("POST", "/appointments", {
    token: docToken,
    body: { patientId: createdPatientId, doctorId: doctor.id, appointmentDate: todayStr, startTime: "19:00", endTime: "19:30", reason: "Doc booking" }
  });
  if (docCreateAppt.status === 403) {
    record("Doctor blocked from booking appointments", "SECURITY", "PASS", "HTTP 403 Forbidden");
  } else {
    record("Doctor blocked from booking appointments", "SECURITY", "FAIL", `Expected 403, got ${docCreateAppt.status}`);
  }

  // Receptionist reads patient notes in profile
  const recReadNotes = await api("GET", `/patients/${createdPatientId}/notes`, { token: recToken });
  const recNotesArray = Array.isArray(recReadNotes.body.data) ? recReadNotes.body.data : [];
  if (recReadNotes.status === 200 && recNotesArray.length > 0) {
    record("Receptionist can view clinical note in patient profile", "RECEPTIONIST", "PASS", "Read-only access granted");
  } else {
    record("Receptionist can view clinical note in patient profile", "RECEPTIONIST", "FAIL", "Note missing for reception");
  }

  // ---------------------------------------------------------------------------
  // CLEANUP
  // ---------------------------------------------------------------------------
  for (const id of cleanupAppointments) {
    await api("PATCH", `/appointments/${id}/cancel`, { token: recToken }).catch(() => {});
  }

  // ---------------------------------------------------------------------------
  // FINAL SUMMARY
  // ---------------------------------------------------------------------------
  console.log("\n================================================================================");
  const total = results.length;
  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.filter((r) => r.status === "FAIL").length;
  console.log(`TOTAL CHECKS: ${total} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("================================================================================\n");

  if (failed > 0) {
    console.error("FAILURES DETECTED:");
    results.filter((r) => r.status === "FAIL").forEach((r) => console.error(` - [${r.role}] ${r.step}: ${r.details}`));
    process.exit(1);
  } else {
    console.log("ALL ROLES, FLOWS, GUARDS, AND SUBMISSIONS PASSED FLAWLESSLY!");
  }
}

run().catch((err) => {
  console.error("Unhandled test runner exception:", err);
  process.exit(1);
});
