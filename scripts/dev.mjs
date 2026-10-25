import { spawn } from "node:child_process";
const children = ["@uh/api", "@uh/admin", "@uh/miniapp"].map((name) =>
  spawn("pnpm", ["--filter", name, "dev"], { stdio: "inherit" }),
);
let stopping = false;
function stop() {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill("SIGTERM");
}
for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, stop);
for (const child of children)
  child.on("exit", (code) => {
    if (!stopping) {
      stop();
      process.exitCode = code || 1;
    }
  });
console.log(
  "Miniapp preview: http://localhost:3072/ | Admin: http://localhost:3071/ | API: http://localhost:3070/api/health/ready",
);
