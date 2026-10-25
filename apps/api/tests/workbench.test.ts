import { afterAll, beforeAll, expect, it } from "vitest";
import Fastify from "fastify";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { registerWorkbench } from "../src/workbench";

const app = Fastify();
let root: string;
beforeAll(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "uh-workbench-test-"));
  await mkdir(path.join(root, "assets"));
  await writeFile(path.join(root, "index.html"), "<h1>version 1</h1>");
  await writeFile(
    path.join(root, "assets/index-a.js"),
    "console.log('fixture')",
  );
  await writeFile(path.join(root, "assets/index-a.css"), "body{color:blue}");
  registerWorkbench(app, root);
});
afterAll(async () => {
  await app.close();
  await rm(root, { recursive: true, force: true });
});
it("返回当前版本 HTML，更新文件后刷新即可生效", async () => {
  const url =
    "/padmin/unemployment/workbench/index.html?embedded=1&section=contents";
  const first = await app.inject(url);
  expect(first.statusCode).toBe(200);
  expect(first.headers["content-type"]).toContain("text/html");
  expect(first.headers["cache-control"]).toBe("no-store");
  expect(first.body).toContain("version 1");
  await writeFile(path.join(root, "index.html"), "<h1>version 2</h1>");
  expect((await app.inject(url)).body).toContain("version 2");
});
it("只提供构建的脚本和样式，保持 MIME 与哈希资源缓存", async () => {
  for (const [file, mime] of [
    ["index-a.js", "text/javascript"],
    ["index-a.css", "text/css"],
  ]) {
    const result = await app.inject(
      "/padmin/unemployment/workbench/assets/" + file,
    );
    expect(result.statusCode).toBe(200);
    expect(result.headers["content-type"]).toContain(mime);
    expect(result.headers["cache-control"]).toContain("immutable");
    expect(result.headers["x-content-type-options"]).toBe("nosniff");
  }
});
it("不暴露环境文件、源码映射或路径穿越，缺失资源返回 404", async () => {
  for (const suffix of [
    ".env",
    "assets/%2e%2e/package.json",
    "%2e%2e/package.json",
    "assets/index-a.js.map",
    "assets/missing.js",
  ]) {
    expect(
      (await app.inject("/padmin/unemployment/workbench/" + suffix)).statusCode,
    ).toBe(404);
  }
});
