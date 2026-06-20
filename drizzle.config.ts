import "dotenv/config";
import { defineConfig } from "drizzle-kit";

// Note: `db:generate` only diffs lib/db/schema.ts against ./drizzle and never
// connects to a database, so DATABASE_URL is optional until you run
// `db:migrate` or `db:studio`.
export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  strict: true,
});
