import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Standard Postgres-protocol client (via `postgres`). Works identically
 * against a local dev Postgres and against Neon (Neon accepts the plain
 * Postgres wire protocol on its pooled connection string), so no
 * Neon-specific serverless driver is required to develop locally — see
 * PLAN.md.
 */
const globalForDb = globalThis as unknown as { _pgClient?: postgres.Sql };

const client =
  globalForDb._pgClient ??
  postgres(process.env.DATABASE_URL!, { max: 10 });

if (process.env.NODE_ENV !== "production") {
  globalForDb._pgClient = client;
}

export const db = drizzle(client, { schema });
