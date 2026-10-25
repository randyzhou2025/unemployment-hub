import { readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
const manifest = JSON.parse(
  await readFile("apps/miniapp/src/manifest.json", "utf8"),
);
if (!/^wx[a-f\d]{16}$/.test(manifest["mp-weixin"].appid))
  throw new Error("请先配置独立微信 AppID");
const environment = await readFile("apps/miniapp/.env.production", "utf8");
if (!/^VITE_API_BASE=https:\/\/[a-z\d.-]+(?::443)?\/?$/im.test(environment))
  throw new Error("生产 API 必须使用 HTTPS 独立域名");
for (const args of [["typecheck"], ["test"], ["build"]]) {
  const result = spawnSync("pnpm", args, { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status || 1);
}
await rm("apps/miniapp/dist/build/mp-weixin/project.private.config.json", {
  force: true,
});
console.log(
  "本地发版门禁通过。请导入 apps/miniapp/dist/build/mp-weixin；微信上传、提审、发布需分别执行并验收。",
);
