# Clinic Management Application (ADRINE Technical Assessment)

A modern, production-grade outpatient clinic management platform built for **Receptionists** and **Doctors**. The system enforces strict role-based access control, PostgreSQL relational data integrity, calendar conflict prevention, patient search with trigram indexing, and server-side patient visibility constraints.

---

## 1. Overview

Outpatient clinics operate in fast-paced environments where reception staff coordinate appointments across multiple practitioners while doctors need focused, confidential access to their daily roster and patient histories.

This application provides:
- **For Receptionists**: Clinic-wide visibility, patient registration and lifecycle management (Active / Inactive / Archived), conflict-free appointment booking, and rescheduling.
- **For Doctors**: Focused daily schedules, access restricted strictly to patients under their active or historical care, and timestamped clinical note documentation.

---

## 2. Key Features

- **Operational Dashboard**:
  - Real-time KPIs: Today's visits, upcoming bookings, total patients, completed & cancelled visits.
  - Interactive 7-day appointment trend chart.
  - Chronological "Today's Schedule" with instant quick-action shortcuts.
- **Patient Management**:
  - Full-text search over patient names, phone numbers, and emails using PostgreSQL trigram indexes (`pg_trgm`).
  - Multi-status filtering (`ACTIVE`, `INACTIVE`, `ARCHIVED`).
  - Column sorting (creation date, first name, last name, updated date) and server-side pagination.
  - Add and Edit patient forms with Zod and React Hook Form validation.
  - Safe archival guard: Cannot archive a patient who has active scheduled appointments.
- **Appointment Scheduling & Conflict Prevention**:
  - Conflict detection engine: Disallows double-booking or overlapping time intervals (e.g. `10:00-10:30` vs `10:15-10:45`) for any practitioner.
  - Wall-clock time model (`appointmentDate` as ISO Date + `startTime`/`endTime` in `HH:mm`) avoiding timezone skew.
  - Appointment lifecycle state machine: `SCHEDULED` → `COMPLETED` / `CANCELLED`.
  - Rescheduling with automatic doctor-availability revalidation.
- **Patient Profile & Clinical Notes**:
  - Complete demographics, contact information, and appointment history.
  - Medical encounter notes recorded by attending physicians with doctor attribution and timestamps.
- **Strict Role-Based Authorization & Privacy Guardrails**:
  - Enforced at the REST API / database query level, never relying on UI hiding alone.
  - Doctor patient visibility rule: Doctors can **only** view patient records and notes for patients who have booked or completed appointments with them.

---

## 3. Technology Stack

| Layer | Technologies | Rationale |
|---|---|---|
| **Frontend** | React 19, TypeScript, Next.js 15 (App Router), Tailwind CSS, Lucide Icons | Server and client component composition, type safety, fast build times, restrained healthcare aesthetic. |
| **Forms & Charts** | React Hook Form, `@hookform/resolvers`, Zod, Recharts | Zero-overhead validated forms and accessible activity charts. |
| **Backend / API** | Next.js API Routes (Node.js runtime), TypeScript, Zod | Unified type-safe REST endpoints with centralized error handling. |
| **Database & ORM** | PostgreSQL 16+, Prisma ORM 6.x | Relational ACID transactions, foreign key constraints, `pg_trgm` indexes. |
| **Security & Auth** | JWT (`jose`), `bcryptjs`, HttpOnly Bearer tokens | Secure token-based session handling, salted password hashes (cost factor 10). |
| **Dev Tooling** | `embedded-postgres`, Docker Compose, `tsx`, TypeScript strict mode | Zero-prerequisite local development with optional Docker support. |

---

## 4. Architecture

```text
Browser Client (React 19 + TypeScript + Tailwind CSS)
   │
   ▼ HTTP / JSON (Bearer JWT)
Next.js REST API Layer (`/api/*`)
   │
   ├─► Middleware: JWT Verification & Role Assertion (`requireAuth`, `requireRole`)
   │
   ├─► Validators: Zod Request Schemas (Body & Query Params)
   │
   ├─► Service Layer: Business Logic & Invariants
   │     ├─► Conflict Detection Engine
   │     ├─► Access Scoping (`patientWhere`, `appointmentWhere`)
   │     └─► Lifecycle Guards (e.g., safe patient archival)
   │
   ▼ Prisma ORM Client
PostgreSQL Database (`clinic_management`)
```

- **Separation of Concerns**: Frontend components interact strictly via the REST client layer (`src/services/api.ts` and `src/services/clinic.service.ts`).
- **Database Query-Level Scoping**: Queries for doctors include `{ appointments: { some: { doctorId } } }` at the Prisma query level. Out-of-scope records return `404 Not Found` rather than leaking existence via `403`.

---

## 5. Database Design

### Entity Relationship Diagram

```text
  ┌──────────────────┐               ┌──────────────────┐
  │      User        │ 1           1 │      Doctor      │
  │──────────────────│───────────────│──────────────────│
  │ id (UUID) PK     │               │ id (UUID) PK     │
  │ name             │               │ userId FK        │
  │ email (UNIQUE)   │               │ specialization   │
  │ passwordHash     │               │ phone            │
  │ role (ENUM)      │               └────────┬─────────┘
  └──────────────────┘                        │
                                              │ 1
                                              │
  ┌──────────────────┐                        │
  │     Patient      │ 1                      │
  │──────────────────│                        │
  │ id (UUID) PK     │                        │
  │ firstName        │                        │
  │ lastName         │                        │
  │ dateOfBirth      │                        │
  │ gender (ENUM)    │                        │
  │ phone            │                        │
  │ email            │                        │
  │ address          │                        │
  │ status (ENUM)    │                        │
  └────────┬─────────┘                        │
           │                                  │
           │ 1                                │ *
           │           ┌──────────────────┐   │
           └──────────►│   Appointment    │◄──┘
                     * │──────────────────│
                       │ id (UUID) PK     │
                       │ patientId FK     │
                       │ doctorId FK      │
                       │ appointmentDate  │
                       │ startTime        │
                       │ endTime          │
                       │ status (ENUM)    │
                       │ reason           │
                       └────────┬─────────┘
                                │ 1
                                │
                                │ *
                       ┌────────▼─────────┐
                       │   ClinicalNote   │
                       │──────────────────│
                       │ id (UUID) PK     │
                       │ patientId FK     │
                       │ doctorId FK      │
                       │ appointmentId FK │
                       │ note (TEXT)      │
                       └──────────────────┘
```

### PostgreSQL Indexes
1. `appointments_doctorId_appointmentDate_startTime_idx`: High-performance doctor daily schedule lookup and conflict detection.
2. `appointments_appointmentDate_status_startTime_idx`: Receptionist schedule filters by date and status.
3. `patients_last_name_trgm_idx`, `patients_first_name_trgm_idx`, `patients_phone_trgm_idx`: GIN trigram indexes for instantaneous partial substring search.
4. `patients_status_idx`: Fast filtering by `ACTIVE`, `INACTIVE`, and `ARCHIVED`.
5. `clinical_notes_patientId_createdAt_idx`: Chronological notes retrieval for patient profiles.

---

## 6. Authentication & Role Permissions

### Authentication Workflow
- `POST /api/auth/login`: Accepts email and password.
- Verifies password with `bcryptjs.compare`.
- Signs a compact JWT containing `sub` (userId), `role`, `name`, `email`, and `doctorId` (if DOCTOR).
- Tokens are submitted via `Authorization: Bearer <token>` header or authenticated session cookie.
- `GET /api/auth/me`: Validates session and returns current user payload.

### Permission Matrix

| Capability | Receptionist | Doctor |
|---|:---:|:---:|
| View Clinic Dashboard & KPIs | Full Clinic | Personal Roster Only |
| Patient List | All Clinic Patients | Appointed Patients Only |
| Register New Patient | Yes | No (403 Forbidden) |
| Edit Patient Demographics | Yes | No (403 Forbidden) |
| View Patient Profile | All Patients | Appointed Patients Only |
| View Appointment History | All Patients | Appointed Patients Only |
| Create / Reschedule Appointment | Yes | No (403 Forbidden) |
| Cancel / Complete Appointment | Yes | Complete own today's visits |
| Write Clinical Notes | No (403 Forbidden) | Yes (Own appointments only) |

---

## 7. API Endpoints

### Authentication
- `POST /api/auth/login`: Authenticate and receive JWT.
- `GET /api/auth/me`: Inspect token and retrieve user profile.
- `POST /api/auth/logout`: Clear session.

### Patients
- `GET /api/patients?page=1&limit=10&search=&status=ACTIVE&sortBy=createdAt&sortOrder=desc`: Paginated search & list (enforces doctor scoping).
- `POST /api/patients`: Create patient (Receptionist only).
- `GET /api/patients/:id`: Retrieve patient details, history, and notes.
- `PUT /api/patients/:id`: Update patient record (Receptionist only).
- `PATCH /api/patients/:id`: Partially update patient fields (e.g. status).

### Appointments
- `GET /api/appointments?page=1&limit=10&date=&doctorId=&status=&search=`: Paginated appointment list.
- `GET /api/appointments/:id`: Retrieve appointment detail.
- `POST /api/appointments`: Book appointment with conflict detection (Receptionist only).
- `PUT /api/appointments/:id`: Reschedule appointment with conflict detection (Receptionist only).
- `PATCH /api/appointments/:id/cancel`: Cancel an appointment (requires reason or confirmation).
- `PATCH /api/appointments/:id/complete`: Mark an appointment as completed.

### Clinical Notes
- `GET /api/patients/:patientId/notes`: Retrieve notes for patient (authorized users only).
- `POST /api/patients/:patientId/notes`: Doctor adds note against their own visit.

### Dashboard & Doctors
- `GET /api/dashboard/stats`: Returns KPI totals, today's schedule, and 7-day trend metrics.
- `GET /api/doctors`: List active doctors and specialties.
- `GET /api/doctors/:id`: Retrieve doctor detail.

---

## 8. Setup Instructions

### Prerequisites
- Node.js 18.x or 20.x
- npm 9.x or higher

### Option A: Zero-Install Quick Start (Embedded PostgreSQL)
No local PostgreSQL or Docker installation is needed. A self-contained embedded PostgreSQL binary is included in the project dependencies.

```bash
# 1. Install dependencies
npm install

# 2. Configure environment (preconfigured for embedded db)
cp .env.example .env

# 3. Start embedded PostgreSQL cluster in a dedicated terminal
npm run db:up

# 4. In a second terminal, deploy schema migrations and seed demo data
npm run db:setup

# 5. Start the Next.js development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.

### Option B: Docker Compose PostgreSQL
If you prefer running PostgreSQL via Docker:

```bash
# 1. Start PostgreSQL container
docker compose up -d

# 2. Update DATABASE_URL in .env
# DATABASE_URL="postgresql://postgres:postgres@localhost:5432/clinic_management?schema=public"

# 3. Deploy migrations and seed
npm run db:setup

# 4. Run application
npm run dev
```

---

## 9. Demo Credentials

| Role | Email | Password | Scope & Notes |
|---|---|---|---|
| **Receptionist** | `reception@clinic.com` | `Password123!` | Full clinic access: creates patients, books appointments, manages schedule. |
| **Doctor (General)** | `doctor@clinic.com` | `Password123!` | Dr. Aarav Sharma: sees appointed patients, writes clinical notes. |
| **Doctor (Paediatrics)** | `meera.iyer@clinic.com` | `Password123!` | Dr. Meera Iyer: paediatric patient panel. |
| **Doctor (Orthopaedics)**| `rohit.deshpande@clinic.com` | `Password123!` | Dr. Rohit Deshpande: orthopaedic patient panel. |

---

## 10. Automated Verification Suite

Run the full end-to-end API test suite (exercises all 59 assessment assertions):

```bash
npm run verify
```

Output:
```text
Verifying against http://localhost:3000/api
...........................................................
Authentication (6/6)             - PASS
Authorization (4/4)              - PASS
Doctor patient visibility (4/4)  - PASS
Patients (14/14)                 - PASS
Appointments (20/20)             - PASS
Clinical notes (6/6)             - PASS
Dashboard (3/3)                  - PASS
Cleanup (2/2)                    - PASS
---------------------------------------------
59/59 checks passed
```

---

## 11. Screenshots

*(Screenshots placeholder)*

- **Dashboard**: Operational KPIs, appointment charts, and today's roster.
- **Patient Table**: Search bar, status dropdown filter, and pagination controls.
- **Patient Profile**: Full history timeline, contact details, and doctor's clinical notes.
- **Appointment Booking**: Real-time slot conflict detection with inline availability errors.

---

## 12. Design Decisions & Engineering Trade-offs

1. **Next.js Full-Stack Architecture**:
   - *Decision*: Next.js 15 App Router pairing React 19 client components with Node.js REST API routes.
   - *Rationale*: Eliminates cross-origin CORS overhead in local evaluation while maintaining clean REST boundaries.
2. **Wall-Clock Time Model for Appointments**:
   - *Decision*: Storing `appointmentDate` as a SQL `DATE` and times as clinic-local `"HH:mm"` 24-hour strings.
   - *Rationale*: Clinics operate in local wall-clock hours. Avoids subtle UTC conversion drift where a 9:00 AM visit shifts to 3:30 AM due to client browser timezone differences.
3. **Database Query-Level Access Enforcement**:
   - *Decision*: Authorization filter injected into Prisma's `where` clause (`patientWhere(auth)`).
   - *Rationale*: Eliminates data leakage vulnerabilities that occur if a server fetches all records and filters in memory.
4. **Deliberate Non-Inclusions**:
   - Billing, insurance claims, pharmacy dispensing, and lab integrations were intentionally omitted to maintain code quality, clarity, and reliability within the assessment scope.

---

## 13. Live Engineering Test Explanation

### Requirement:
> *"A doctor may only view patients who have an appointment with that doctor."*

### Implementation Architecture:
All patient queries route through `patientWhere(auth)` defined in [`src/server/auth/access.ts`](file:///d:/mirzapur/Adrine/src/server/auth/access.ts):

```typescript
export function patientWhere(auth: AuthUser): Prisma.PatientWhereInput {
  if (auth.role === "RECEPTIONIST") return {};
  if (PATIENT_VISIBILITY.DOCTOR === "ALL") return {};

  return {
    appointments: { some: { doctorId: requireDoctorId(auth) } },
  };
}
```

- When `auth.role === "DOCTOR"`, the query produces SQL:
  ```sql
  WHERE EXISTS (
    SELECT 1 FROM appointments
    WHERE appointments."patientId" = patients.id
      AND appointments."doctorId" = $1
  )
  ```
- Toggle demonstration: Switching `PATIENT_VISIBILITY.DOCTOR` from `"APPOINTED_ONLY"` to `"ALL"` immediately toggles the behavior system-wide without touching controllers or frontend code.

---

## 14. Scaling Strategy

### At 100 Doctors, 1,000,000 Patients, 50,000 Appointments/Day:

1. **Database Layer**:
   - **Partitioning**: Partition the `appointments` table by `appointmentDate` (range partitioning by month) to keep daily index trees compact in memory.
   - **Read Replicas**: Route read-heavy queries (dashboard stats, patient search) to read replicas while writes (booking, clinical notes) hit the primary.
   - **Keyset / Cursor Pagination**: Transition patient and appointment tables from `OFFSET / LIMIT` to cursor pagination (`WHERE id > :cursor LIMIT 20`) to eliminate high-offset performance degradation.
2. **Caching & Concurrency**:
   - **Distributed Locks**: Use Redis distributed locks (`Redlock`) around `doctorId + date + slot` during appointment creation to prevent race conditions during concurrent bookings.
   - **Dashboard Pre-aggregation**: Pre-aggregate dashboard counters via Redis hashes or PostgreSQL materialised views refreshed asynchronously.
3. **Horizontal API Scaling**:
   - Stateless containerized API nodes behind an NGINX / AWS ALB load balancer.
   - Connection pooling using **PgBouncer** in transaction pooling mode to manage thousands of concurrent DB connections efficiently.
