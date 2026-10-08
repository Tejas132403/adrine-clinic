# ADRINE Technical Assessment — Presentation Talking Points

This document provides concise, high-impact answers to the interview questions and evaluation criteria for the Clinic Management Application.

---

## 1. Product: What Problem Does This Solve?
Outpatient clinics face two daily coordination challenges:
1. **Reception friction**: Scheduling conflicts, double-booking, and managing high patient throughput across multiple doctors with different working hours.
2. **Clinical privacy & focus**: Doctors need quick access to their daily roster and previous notes without cognitive clutter or privacy risks from seeing unrelated patient records across the hospital.

This solution provides a fast, conflict-proof scheduling engine for receptionists paired with a focused, confidential workspace for physicians.

---

## 2. Architecture: How Does the Frontend Communicate with the Backend?
- **Pattern**: Clean REST API contract over HTTP with JSON payloads and Bearer token authentication.
- **Client layer**: Frontend components never make direct database queries or ad-hoc fetch requests. All communication flows through typed Axios service modules (`src/services/clinic.service.ts` and `src/services/api.ts`).
- **Server layer**: Incoming requests hit Next.js route handlers (`src/app/api/...`), pass through Zod payload validation and JWT authentication middleware, and execute domain logic in dedicated service files (`src/server/services/...`) backed by Prisma ORM.
- **Error propagation**: The backend emits standardized RFC-compliant error structures (`{ success: false, message, errors }`) mapped to HTTP status codes (400, 401, 403, 404, 409, 500) which the frontend interceptor converts into user-friendly form errors and toast notifications.

---

## 3. Database: Why These Entities and Relationships?
The schema models relational realities of outpatient care:
- **`User` (1) ↔ (1) `Doctor`**: Decouples authentication credentials and security roles from clinical metadata (specialization, phone).
- **`Patient` (1) ↔ (*) `Appointment` (*) ↔ (1) `Doctor`**: The `Appointment` entity acts as the critical associative link joining patients and doctors on a specific calendar date and time interval.
- **`Appointment` (1) ↔ (*) `ClinicalNote`**: Ties medical notes directly to an encounter, preserving legal and medical context rather than storing free-floating notes.
- **Foreign Key Actions**: Relations to medical history use `onDelete: Restrict` so clinical records cannot be accidentally deleted by cascading row removals.
- **Indexing**: Composite indexes on `[doctorId, appointmentDate, startTime]` allow microsecond conflict detection, while PostgreSQL `pg_trgm` indexes power fuzzy patient search.

---

## 4. Authentication: How Does Login Work?
1. The client submits `email` and `password` via `POST /api/auth/login`.
2. The server fetches the user record and verifies the password hash using `bcryptjs.compare` (passwords are salted with cost factor 10 and never stored in plaintext).
3. Upon success, a compact JWT is signed with `jose` using a server-side secret (`HS256`).
4. The JWT payload encapsulates user identity: `sub` (userId), `name`, `email`, `role`, and `doctorId` (if applicable).
5. The token is returned to the client and stored in memory/session storage; subsequent requests pass it in the `Authorization: Bearer <token>` header.

---

## 5. Authorization: How Are Roles Enforced?
- **Server-side enforcement**: Never trust the client. While the UI hides unauthorized buttons, every single API route invokes `requireRole("RECEPTIONIST")` or `requireRole("DOCTOR")`.
- **Unauthorized attempts**:
  - Unauthenticated requests receive `401 Unauthorized`.
  - Authenticated users attempting out-of-role actions (e.g. a doctor creating an appointment or a receptionist writing a clinical note) receive `403 Forbidden`.
- **Data-level authorization**: Even when a doctor is authorized to call `GET /api/patients`, the query itself is scoped by `patientWhere(auth)` to only return their assigned patients.

---

## 6. UI/UX: What Are 3 Important Design Decisions?
1. **Restrained Healthcare Aesthetic**:
   - Avoided loud gradients, toy-like animations, and generic SaaS templates.
   - Used a clinical slate/blue palette, legible typography, and dense, structured tables that allow staff to scan patient rosters quickly.
2. **Inline Conflict Prevention & Availability Feedback**:
   - Rather than letting a user submit a form and get a generic error, appointment booking checks doctor availability and provides precise conflict feedback (e.g. *"This doctor is unavailable from 10:00 AM to 10:30 AM"*).
3. **Comprehensive UI States**:
   - Every view handles all five fundamental states: **Loading** (skeleton screens, no layout shift), **Empty** (helpful callouts with action triggers), **Error** (clear message with retry button), **Validation** (field-level Zod errors), and **Success** (toast confirmation).

---

## 7. Engineering: What Part of the Code Is Particularly Well Designed?
**The Conflict Detection & Appointment State Machine** (`src/server/services/appointment.service.ts`):
- Converts time strings into normalized minutes from midnight (`09:30` → `570`).
- Validates interval overlap: `existingStart < requestedEnd && existingEnd > requestedStart`.
- Respects clinic operating hours (08:00 to 20:00) and enforces non-zero duration.
- Enforces strict lifecycle transitions: an appointment cannot be completed before its appointment date, cannot be cancelled twice, and clinical notes cannot be added to cancelled appointments.
- Executes within an ACID transaction ensuring zero race-condition bookings.

---

## 8. Trade-offs: What Did You Deliberately NOT Build and Why?
- **Omitted Billing & Invoicing**: Outpatient billing is a complex multi-payer domain requiring ledger balances, taxes, and payment gateways. Omitting it preserved maximum focus on bulletproof scheduling and clinical documentation.
- **Omitted WebSockets / Polling**: Used standard REST requests with optimistic cache updates instead of WebSockets. In a 3-hour assessment, WebSockets introduce unnecessary connection-lifecycle complexity without improving the core clinical workflow.
- **Omitted External Cloud Storage for Attachments**: Kept clinical notes text-based rather than supporting PDF/scan uploads to keep the infrastructure portable, fast, and testable locally.

---

## 9. Scaling: What Changes at 1M Patients & 50K Appointments/Day?
1. **Database Partitioning**:
   - Partition the `appointments` table by `RANGE (appointmentDate)` (e.g., monthly partitions) so query engines scan only the active month's index.
2. **Keyset / Cursor Pagination**:
   - Replace `OFFSET ... LIMIT` pagination with cursor-based pagination (`WHERE id > :cursor LIMIT 20`) to eliminate $O(N)$ row-skipping penalties on 1,000,000 patient records.
3. **Concurrency Control with Redis Distributed Locks**:
   - To handle thousands of concurrent bookings, place a Redis lock on `lock:doctor:{doctorId}:{date}:{slot}` during the reservation window to serialize slot claims before committing to PostgreSQL.
4. **Connection Pooling & Read Replicas**:
   - Deploy **PgBouncer** in front of PostgreSQL to handle high-frequency short-lived connections.
   - Direct read-only traffic (patient lookups, dashboard statistics) to read replicas while writes hit the primary instance.

---

## 10. Live Requirement: How Would You Implement Doctor-Specific Patient Access?
- **Where it lives**: Centralized in [`src/server/auth/access.ts`](file:///d:/mirzapur/Adrine/src/server/auth/access.ts) in the `patientWhere` function.
- **How it works**:
  ```typescript
  export function patientWhere(auth: AuthUser): Prisma.PatientWhereInput {
    if (auth.role === "RECEPTIONIST") return {};
    return {
      appointments: { some: { doctorId: requireDoctorId(auth) } },
    };
  }
  ```
- **Why this design is superior**:
  - The check is compiled directly into the SQL `WHERE EXISTS (...)` clause by Prisma.
  - It protects `listPatients`, `getPatientById`, `appointmentHistory`, and `clinicalNotes` in one single place.
  - Out-of-scope patient IDs return `404 Not Found`, completely preventing unauthorized ID harvesting.
  - Can be toggled live by changing `PATIENT_VISIBILITY.DOCTOR` from `"APPOINTED_ONLY"` to `"ALL"`.

---

## 11. Future Improvements: 3 Highest-Value Improvements with Another 2 Days
1. **SMS & WhatsApp Appointment Reminders**:
   - Automated notification triggers (via Twilio or Gupshup) sent 24 hours and 2 hours prior to scheduled visits to reduce no-show rates.
2. **Prescription & Diagnostic Order Module**:
   - Structured medicine prescribing with dosage, frequency, and drug-interaction warnings integrated into the `ClinicalNote` modal.
3. **Doctor Shift & Leave Management**:
   - Configurable doctor working schedules, breaks, and holiday blocks so receptionists cannot book slots when a physician is off-duty.
