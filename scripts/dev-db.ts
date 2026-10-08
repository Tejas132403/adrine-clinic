/**
 * Local development database.
 *
 * Starts a real PostgreSQL server using embedded binaries, so the assessment
 * project runs with `npm run db:up` and no Docker/install step. The cluster is
 * stored in `.pgdata/` (gitignored) and keeps data between runs.
 *
 * If you prefer Docker, `docker compose up -d` starts PostgreSQL on 5432 and
 * you only need to point DATABASE_URL at it. Nothing else changes.
 */
import EmbeddedPostgres from "embedded-postgres";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

function loadEnvFile(): void {
  const envPath = path.join(process.cwd(), ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i.exec(line);
    if (!match) continue;
    const key = match[1] as string;
    const raw = (match[2] ?? "").trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = raw;
  }
}

loadEnvFile();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("[db] DATABASE_URL is missing. Copy .env.example to .env first.");
  process.exit(1);
}

const url = new URL(databaseUrl);
const port = Number(url.port || 5432);
const user = decodeURIComponent(url.username || "postgres");
const password = decodeURIComponent(url.password || "postgres");
const database = url.pathname.replace(/^\//, "") || "clinic_management";

const pg = new EmbeddedPostgres({
  databaseDir: path.join(process.cwd(), ".pgdata"),
  user,
  password,
  port,
  persistent: true,
  onLog: (message) => {
    const line = message.trim();
    if (line && !line.startsWith("LOG:")) console.log(`[postgres] ${line}`);
  },
});

async function main(): Promise<void> {
  const firstRun = !existsSync(path.join(process.cwd(), ".pgdata", "PG_VERSION"));
  if (firstRun) {
    console.log("[db] Initialising local PostgreSQL cluster (.pgdata) ...");
    await pg.initialise();
  }

  await pg.start();
  console.log(`[db] PostgreSQL is running on localhost:${port} (user: ${user})`);

  const existing = await pg
    .getPgClient()
    .query<{ datname: string }>("SELECT datname FROM pg_database WHERE datname = $1", [database]);
  if (existing.rows.length === 0) {
    await pg.createDatabase(database);
    console.log(`[db] Created database "${database}"`);
  }

  console.log(`[db] DATABASE_URL=${databaseUrl}`);
  console.log("[db] Ready. In another terminal run: npm run db:setup && npm run dev");
  console.log("[db] Keep this process running. Press Ctrl+C to stop PostgreSQL.");
}

async function shutdown(): Promise<void> {
  console.log("\n[db] Stopping PostgreSQL ...");
  try {
    await pg.stop();
  } finally {
    process.exit(0);
  }
}

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());

main().catch(async (error: unknown) => {
  console.error("[db] Failed to start local PostgreSQL:", error);
  try {
    await pg.stop();
  } catch {
    /* already stopped */
  }
  process.exit(1);
});
