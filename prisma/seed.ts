/**
 * Demo seed data for the clinic.
 *
 * Run with:  npm run db:seed
 *
 * The dates are relative to "today", so the dashboard always looks populated
 * (today's schedule, the last 7 days of activity, upcoming week, history).
 * A few patients deliberately have no appointments at all - they are used to
 * demonstrate the doctor-scoped patient access rule (see README).
 */
import { PrismaClient, AppointmentStatus, Gender, PatientStatus, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "Password123!";

/** Clinic-local calendar date (date-only, stored at UTC midnight). */
function dateOnly(offsetDays: number): Date {
  const now = new Date();
  const date = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date;
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

type DoctorSeed = {
  name: string;
  email: string;
  specialization: string;
  phone: string;
};

const doctors: DoctorSeed[] = [
  {
    name: "Dr. Aarav Sharma",
    email: "doctor@clinic.com",
    specialization: "General Medicine",
    phone: "+91 98200 41122",
  },
  {
    name: "Dr. Meera Iyer",
    email: "meera.iyer@clinic.com",
    specialization: "Paediatrics",
    phone: "+91 98200 77345",
  },
  {
    name: "Dr. Rohit Deshpande",
    email: "rohit.deshpande@clinic.com",
    specialization: "Orthopaedics",
    phone: "+91 98195 20871",
  },
];

type PatientSeed = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: Gender;
  phone: string;
  email: string | null;
  address: string;
  status: PatientStatus;
  registeredDaysAgo: number;
};

const patients: PatientSeed[] = [
  { firstName: "Rohan", lastName: "Sharma", dateOfBirth: "1988-04-12", gender: Gender.MALE, phone: "+91 98765 43210", email: "rohan.sharma@example.com", address: "Bandra West, Mumbai, Maharashtra", status: PatientStatus.ACTIVE, registeredDaysAgo: 240 },
  { firstName: "Priya", lastName: "Nair", dateOfBirth: "1995-11-03", gender: Gender.FEMALE, phone: "+91 98204 55188", email: "priya.nair@example.com", address: "Andheri East, Mumbai, Maharashtra", status: PatientStatus.ACTIVE, registeredDaysAgo: 180 },
  { firstName: "Ananya", lastName: "Iyer", dateOfBirth: "2016-07-21", gender: Gender.FEMALE, phone: "+91 99870 21456", email: "guardian.iyer@example.com", address: "Powai, Mumbai, Maharashtra", status: PatientStatus.ACTIVE, registeredDaysAgo: 160 },
  { firstName: "Vikram", lastName: "Rathore", dateOfBirth: "1979-02-09", gender: Gender.MALE, phone: "+91 98330 77219", email: "vikram.rathore@example.com", address: "Koregaon Park, Pune, Maharashtra", status: PatientStatus.ACTIVE, registeredDaysAgo: 150 },
  { firstName: "Sunita", lastName: "Deshmukh", dateOfBirth: "1962-09-30", gender: Gender.FEMALE, phone: "+91 98191 33447", email: null, address: "Kothrud, Pune, Maharashtra", status: PatientStatus.ACTIVE, registeredDaysAgo: 320 },
  { firstName: "Imran", lastName: "Qureshi", dateOfBirth: "1991-06-17", gender: Gender.MALE, phone: "+91 90045 66123", email: "imran.qureshi@example.com", address: "Banjara Hills, Hyderabad, Telangana", status: PatientStatus.ACTIVE, registeredDaysAgo: 132 },
  { firstName: "Kavya", lastName: "Reddy", dateOfBirth: "2001-01-25", gender: Gender.FEMALE, phone: "+91 99490 88231", email: "kavya.reddy@example.com", address: "Jubilee Hills, Hyderabad, Telangana", status: PatientStatus.ACTIVE, registeredDaysAgo: 96 },
  { firstName: "Arjun", lastName: "Menon", dateOfBirth: "1985-12-05", gender: Gender.MALE, phone: "+91 98470 11902", email: null, address: "Indiranagar, Bengaluru, Karnataka", status: PatientStatus.ACTIVE, registeredDaysAgo: 88 },
  { firstName: "Farah", lastName: "Sheikh", dateOfBirth: "1998-03-14", gender: Gender.FEMALE, phone: "+91 97690 44715", email: "farah.sheikh@example.com", address: "Koramangala, Bengaluru, Karnataka", status: PatientStatus.ACTIVE, registeredDaysAgo: 74 },
  { firstName: "Deepak", lastName: "Joshi", dateOfBirth: "1974-08-08", gender: Gender.MALE, phone: "+91 98903 22190", email: "deepak.joshi@example.com", address: "Vashi, Navi Mumbai, Maharashtra", status: PatientStatus.ACTIVE, registeredDaysAgo: 65 },
  { firstName: "Meenakshi", lastName: "Rao", dateOfBirth: "1955-05-19", gender: Gender.FEMALE, phone: "+91 98860 73341", email: null, address: "Jayanagar, Bengaluru, Karnataka", status: PatientStatus.INACTIVE, registeredDaysAgo: 430 },
  { firstName: "Sanjay", lastName: "Gupta", dateOfBirth: "1968-10-27", gender: Gender.MALE, phone: "+91 98110 66504", email: "sanjay.gupta@example.com", address: "Greater Kailash, New Delhi, Delhi", status: PatientStatus.INACTIVE, registeredDaysAgo: 380 },
  // Registered but never booked a visit - used for the doctor-scope demo.
  { firstName: "Nikhil", lastName: "Bhatia", dateOfBirth: "1993-02-02", gender: Gender.MALE, phone: "+91 99100 87223", email: null, address: "Sector 18, Noida, Uttar Pradesh", status: PatientStatus.ARCHIVED, registeredDaysAgo: 500 },
  { firstName: "Tanvi", lastName: "Kapoor", dateOfBirth: "1987-07-11", gender: Gender.FEMALE, phone: "+91 98105 44987", email: "tanvi.kapoor@example.com", address: "Vasant Kunj, New Delhi, Delhi", status: PatientStatus.ARCHIVED, registeredDaysAgo: 460 },
  { firstName: "Rahul", lastName: "Verma", dateOfBirth: "2003-09-09", gender: Gender.MALE, phone: "+91 99303 51278", email: "rahul.verma@example.com", address: "Thane West, Mumbai, Maharashtra", status: PatientStatus.ACTIVE, registeredDaysAgo: 40 },
];

/** patientIdx / doctorIdx refer to the arrays above. */
type AppointmentSeed = {
  patientIdx: number;
  doctorIdx: number;
  dayOffset: number;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  reason: string;
};

const appointments: AppointmentSeed[] = [
  // ---- Today
  { patientIdx: 4, doctorIdx: 0, dayOffset: 0, startTime: "09:00", endTime: "09:30", status: AppointmentStatus.COMPLETED, reason: "Type 2 diabetes follow-up" },
  { patientIdx: 1, doctorIdx: 0, dayOffset: 0, startTime: "09:45", endTime: "10:15", status: AppointmentStatus.COMPLETED, reason: "Migraine review" },
  { patientIdx: 2, doctorIdx: 1, dayOffset: 0, startTime: "10:00", endTime: "10:30", status: AppointmentStatus.COMPLETED, reason: "Child immunisation - DTaP booster" },
  { patientIdx: 0, doctorIdx: 0, dayOffset: 0, startTime: "10:30", endTime: "11:00", status: AppointmentStatus.SCHEDULED, reason: "Fever and sore throat" },
  { patientIdx: 5, doctorIdx: 0, dayOffset: 0, startTime: "11:15", endTime: "11:45", status: AppointmentStatus.SCHEDULED, reason: "Persistent dry cough" },
  { patientIdx: 3, doctorIdx: 2, dayOffset: 0, startTime: "09:30", endTime: "10:15", status: AppointmentStatus.SCHEDULED, reason: "Knee pain assessment" },
  { patientIdx: 9, doctorIdx: 0, dayOffset: 0, startTime: "14:00", endTime: "14:30", status: AppointmentStatus.CANCELLED, reason: "Blood pressure review" },

  // ---- Upcoming week
  { patientIdx: 2, doctorIdx: 1, dayOffset: 1, startTime: "09:15", endTime: "09:45", status: AppointmentStatus.SCHEDULED, reason: "Growth and nutrition review" },
  { patientIdx: 7, doctorIdx: 2, dayOffset: 1, startTime: "10:00", endTime: "10:30", status: AppointmentStatus.SCHEDULED, reason: "Post-operative knee follow-up" },
  { patientIdx: 8, doctorIdx: 0, dayOffset: 1, startTime: "16:00", endTime: "16:30", status: AppointmentStatus.SCHEDULED, reason: "Annual health check" },
  { patientIdx: 6, doctorIdx: 0, dayOffset: 2, startTime: "11:00", endTime: "11:30", status: AppointmentStatus.SCHEDULED, reason: "Thyroid profile review" },
  { patientIdx: 5, doctorIdx: 0, dayOffset: 3, startTime: "09:30", endTime: "10:00", status: AppointmentStatus.SCHEDULED, reason: "Chest X-ray review" },
  { patientIdx: 4, doctorIdx: 0, dayOffset: 3, startTime: "12:00", endTime: "12:30", status: AppointmentStatus.SCHEDULED, reason: "Diabetes follow-up" },
  { patientIdx: 9, doctorIdx: 0, dayOffset: 5, startTime: "15:00", endTime: "15:30", status: AppointmentStatus.SCHEDULED, reason: "Migraine consultation" },
  { patientIdx: 1, doctorIdx: 0, dayOffset: 6, startTime: "10:15", endTime: "10:45", status: AppointmentStatus.SCHEDULED, reason: "Migraine follow-up" },

  // ---- Recent past (drives the 7-day activity chart + patient history)
  { patientIdx: 0, doctorIdx: 0, dayOffset: -1, startTime: "10:15", endTime: "10:45", status: AppointmentStatus.COMPLETED, reason: "Viral fever" },
  { patientIdx: 3, doctorIdx: 2, dayOffset: -1, startTime: "11:00", endTime: "11:30", status: AppointmentStatus.COMPLETED, reason: "Knee pain assessment" },
  { patientIdx: 5, doctorIdx: 0, dayOffset: -2, startTime: "09:45", endTime: "10:15", status: AppointmentStatus.COMPLETED, reason: "Cough and cold" },
  { patientIdx: 9, doctorIdx: 0, dayOffset: -2, startTime: "14:00", endTime: "14:30", status: AppointmentStatus.CANCELLED, reason: "Blood pressure review" },
  { patientIdx: 4, doctorIdx: 0, dayOffset: -3, startTime: "09:00", endTime: "09:30", status: AppointmentStatus.COMPLETED, reason: "Diabetes follow-up" },
  { patientIdx: 1, doctorIdx: 0, dayOffset: -3, startTime: "11:30", endTime: "12:00", status: AppointmentStatus.COMPLETED, reason: "Migraine review" },
  { patientIdx: 7, doctorIdx: 2, dayOffset: -4, startTime: "10:00", endTime: "10:30", status: AppointmentStatus.COMPLETED, reason: "Ankle sprain" },
  { patientIdx: 6, doctorIdx: 0, dayOffset: -5, startTime: "09:30", endTime: "10:00", status: AppointmentStatus.COMPLETED, reason: "General consultation" },
  { patientIdx: 8, doctorIdx: 0, dayOffset: -5, startTime: "12:15", endTime: "12:45", status: AppointmentStatus.CANCELLED, reason: "Annual health check" },
  { patientIdx: 0, doctorIdx: 0, dayOffset: -6, startTime: "15:30", endTime: "16:00", status: AppointmentStatus.COMPLETED, reason: "Fever follow-up" },

  // ---- Older history
  { patientIdx: 0, doctorIdx: 0, dayOffset: -30, startTime: "10:30", endTime: "11:00", status: AppointmentStatus.COMPLETED, reason: "General consultation" },
  { patientIdx: 3, doctorIdx: 2, dayOffset: -45, startTime: "11:00", endTime: "11:30", status: AppointmentStatus.COMPLETED, reason: "Knee stiffness" },
  { patientIdx: 4, doctorIdx: 0, dayOffset: -60, startTime: "09:00", endTime: "09:30", status: AppointmentStatus.COMPLETED, reason: "Diabetes review" },
  { patientIdx: 10, doctorIdx: 0, dayOffset: -90, startTime: "12:00", endTime: "12:30", status: AppointmentStatus.COMPLETED, reason: "Joint pain" },
  { patientIdx: 11, doctorIdx: 0, dayOffset: -120, startTime: "10:00", endTime: "10:30", status: AppointmentStatus.COMPLETED, reason: "Hypertension review" },
];

/** Notes are attached to completed visits; appointmentIdx refers to `appointments`. */
const notes: { appointmentIdx: number; text: string; writtenDaysAfter: number }[] = [
  { appointmentIdx: 18, text: "Fasting blood sugar 142 mg/dL, HbA1c 7.4%. Continue Metformin 500 mg twice daily. Diet counselling given; repeat labs in 3 months.", writtenDaysAfter: 0 },
  { appointmentIdx: 15, text: "Acute viral fever, no red flags on examination. Advised oral fluids, paracetamol 650 mg SOS. Review if fever persists beyond three days.", writtenDaysAfter: 0 },
  { appointmentIdx: 16, text: "Grade II medial meniscus strain on MRI. Physiotherapy twice weekly for three weeks. Avoid squatting and stair climbing.", writtenDaysAfter: 1 },
  { appointmentIdx: 17, text: "Acute bronchitis. Azithromycin 500 mg once daily for three days, steam inhalation twice daily.", writtenDaysAfter: 0 },
  { appointmentIdx: 19, text: "Migraine without aura. Started propranolol 20 mg at night. Advised headache diary and trigger identification.", writtenDaysAfter: 0 },
  { appointmentIdx: 20, text: "X-ray shows no fracture or effusion. RICE protocol explained. Review in two weeks if pain persists.", writtenDaysAfter: 0 },
];

async function main(): Promise<void> {
  console.log("Seeding clinic database ...");

  // FK-safe order (history first).
  await prisma.clinicalNote.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.doctor.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const receptionist = await prisma.user.create({
    data: {
      name: "Sneha Kulkarni",
      email: "reception@clinic.com",
      passwordHash,
      role: Role.RECEPTIONIST,
    },
  });

  const doctorRecords = [];
  for (const doctor of doctors) {
    const user = await prisma.user.create({
      data: { name: doctor.name, email: doctor.email, passwordHash, role: Role.DOCTOR },
    });
    const record = await prisma.doctor.create({
      data: {
        userId: user.id,
        specialization: doctor.specialization,
        phone: doctor.phone,
      },
    });
    doctorRecords.push(record);
  }

  const patientRecords = [];
  for (const patient of patients) {
    const record = await prisma.patient.create({
      data: {
        firstName: patient.firstName,
        lastName: patient.lastName,
        dateOfBirth: new Date(`${patient.dateOfBirth}T00:00:00.000Z`),
        gender: patient.gender,
        phone: patient.phone,
        email: patient.email,
        address: patient.address,
        status: patient.status,
        createdAt: daysAgo(patient.registeredDaysAgo),
      },
    });
    patientRecords.push(record);
  }

  const appointmentRecords = [];
  for (const appointment of appointments) {
    const patient = patientRecords[appointment.patientIdx];
    const doctor = doctorRecords[appointment.doctorIdx];
    if (!patient || !doctor) throw new Error("Seed data references an unknown patient or doctor");

    const record = await prisma.appointment.create({
      data: {
        patientId: patient.id,
        doctorId: doctor.id,
        appointmentDate: dateOnly(appointment.dayOffset),
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        status: appointment.status,
        reason: appointment.reason,
        createdAt: daysAgo(Math.max(1, Math.abs(appointment.dayOffset) + 2)),
      },
    });
    appointmentRecords.push(record);
  }

  for (const note of notes) {
    const appointment = appointmentRecords[note.appointmentIdx];
    if (!appointment) throw new Error("Seed data references an unknown appointment");
    await prisma.clinicalNote.create({
      data: {
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
        appointmentId: appointment.id,
        note: note.text,
        createdAt: daysAgo(Math.max(0, Math.abs(note.writtenDaysAfter))),
      },
    });
  }

  const [patientCount, appointmentCount, noteCount] = await Promise.all([
    prisma.patient.count(),
    prisma.appointment.count(),
    prisma.clinicalNote.count(),
  ]);

  console.log("Seed complete.");
  console.log(`  receptionist : ${receptionist.email} / ${DEMO_PASSWORD}`);
  console.log(`  doctors      : ${doctors.map((d) => d.email).join(", ")} / ${DEMO_PASSWORD}`);
  console.log(`  patients: ${patientCount} | appointments: ${appointmentCount} | clinical notes: ${noteCount}`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
