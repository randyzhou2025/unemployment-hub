import { readdir, stat, readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
const root = path.resolve("apps/miniapp/dist/build/mp-weixin");
async function files(dir) {
  const result = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...(await files(file)));
    else result.push(file);
  }
  return result;
}
const config = JSON.parse(await readFile(path.join(root, "app.json"), "utf8"));
const subRoots = (config.subPackages || []).map((p) =>
  p.root.replace(/\/$/, ""),
);
const totals = { main: 0, ...Object.fromEntries(subRoots.map((p) => [p, 0])) };
let media = 0;
for (const file of await files(root)) {
  const relative = path.relative(root, file);
  const size = (await stat(file)).size;
  const sub = subRoots.find((p) => relative.startsWith(p + "/"));
  totals[sub || "main"] += size;
  if (/\.(png|jpe?g|webp|gif|mp3|wav)$/i.test(file)) media += size;
}
for (const [name, total] of Object.entries(totals))
  if (total > (name === "main" ? 1.5 : 1) * 1024 * 1024)
    throw new Error(name + " exceeds internal package budget");
if (media > 180000) throw new Error("Media exceed 180000 byte internal budget");
const output = {
  checkedAt: new Date().toISOString(),
  bytes: totals,
  mediaBytes: media,
};
await mkdir("docs/acceptance", { recursive: true });
await writeFile(
  "docs/acceptance/weapp-budget.json",
  JSON.stringify(output, null, 2) + "\n",
);
console.log(output);
