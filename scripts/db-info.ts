/**
 * Prints a quick health report of the connected PostgreSQL database:
 * row counts per table and the indexes Prisma/pg_trgm created.
 * Handy during the demo to prove the UI is backed by the real database.
 *
 *   npm run db:info
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const [users, doctors, patients, appointments, notes, indexes] = await Promise.all([
    prisma.user.count(),
    prisma.doctor.count(),
    prisma.patient.count(),
    prisma.appointment.count(),
    prisma.clinicalNote.count(),
    prisma.$queryRaw<{ tablename: string; indexname: string }[]>`
      SELECT tablename, indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname
    `,
  ]);

  console.log("Tables:");
  console.log(`  users            ${users}`);
  console.log(`  doctors          ${doctors}`);
  console.log(`  patients         ${patients}`);
  console.log(`  appointments     ${appointments}`);
  console.log(`  clinical_notes   ${notes}`);
  console.log("\nIndexes:");
  for (const index of indexes) {
    console.log(`  ${index.tablename.padEnd(16)} ${index.indexname}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
