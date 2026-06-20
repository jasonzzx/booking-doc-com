import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

let cached: ReturnType<typeof drizzle<typeof schema>> | undefined;

// Lazy singleton: importing this module must never throw at build time (Next
// builds statically analyze/prerender pages before env vars are guaranteed
// to be wired up). The connection is only created the first time a server
// action or route handler actually queries the database.
export function getDb() {
  if (!cached) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error(
        "DATABASE_URL is not set. Add it to your .env file (see README for Neon setup).",
      );
    }
    cached = drizzle(neon(url), { schema });
  }
  return cached;
}
