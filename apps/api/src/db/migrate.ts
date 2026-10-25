import postgres from "postgres";
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required");
const client = postgres(url, { max: 1 });
try {
  const directory = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../drizzle",
  );
  await client.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(71019300)`;
    await tx`CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`;
    for (const name of (await readdir(directory))
      .filter((n) => n.endsWith(".sql"))
      .sort()) {
      if (
        (await tx`SELECT name FROM schema_migrations WHERE name=${name}`).length
      )
        continue;
      await tx.unsafe(await readFile(path.join(directory, name), "utf8"));
      await tx`INSERT INTO schema_migrations(name) VALUES(${name})`;
      console.log("Applied", name);
    }
  });
} finally {
  await client.end();
}
