import fs from "node:fs";
import path from "node:path";

// Node 20.12+/22 native env-file loader — loads .env.local for tests that
// hit the real (local dev) Postgres instance. Silently skipped if absent
// so unit tests that don't touch the DB still run in CI without it.
const envPath = path.resolve(__dirname, "../.env.local");
if (fs.existsSync(envPath) && typeof process.loadEnvFile === "function") {
  process.loadEnvFile(envPath);
}
