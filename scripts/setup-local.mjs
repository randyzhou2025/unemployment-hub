import { readFile, writeFile, access } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
const envPath = "apps/api/.env";
try {
  await access(envPath);
} catch {
  const example = await readFile("apps/api/.env.example", "utf8");
  await writeFile(
    envPath,
    example.replace(
      "replace-with-a-long-local-password",
      randomBytes(24).toString("base64url"),
    ),
    { mode: 0o600 },
  );
}
for (const [command, args] of [
  ["docker", ["compose", "-f", "deploy/compose.dev.yml", "up", "-d", "--wait"]],
  ["pnpm", ["db:migrate"]],
  ["pnpm", ["db:seed"]],
]) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log(
  "本地数据库已准备好。运行 pnpm dev；后台用户名为 admin，随机密码位于 apps/api/.env。已有账号和内容不会被覆盖。",
);
