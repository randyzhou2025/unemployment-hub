import { cp, mkdir, rm, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "apps/admin/dist");
const target = path.resolve(
  root,
  "../XueXiDaZi/integrations/unemployment-workbench",
);
await access(path.join(source, "index.html"));
await mkdir(path.dirname(target), { recursive: true });
await rm(target, { recursive: true, force: true });
await cp(source, target, { recursive: true });
console.log("已导出失业有数工作台：" + target);
