import { build } from "esbuild";
await build({
  entryPoints: ["src/server.ts", "src/db/migrate.ts", "src/db/seed.ts"],
  outdir: "dist",
  outbase: "src",
  bundle: true,
  external: [
    "fastify",
    "@fastify/*",
    "drizzle-orm",
    "drizzle-orm/*",
    "postgres",
    "zod",
    "marked",
  ],
  format: "esm",
  platform: "node",
  target: "node24",
  sourcemap: true,
});
