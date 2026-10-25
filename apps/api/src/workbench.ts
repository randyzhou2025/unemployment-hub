import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { FastifyInstance } from "fastify";

export function registerWorkbench(
  app: FastifyInstance,
  root = fileURLToPath(new URL("../../admin/dist/", import.meta.url)),
) {
  app.get("/padmin/unemployment/workbench/*", async (req, reply) => {
    const relative = (req.params as { "*": string })["*"] || "index.html";
    if (
      relative !== "index.html" &&
      !/^assets\/[\w.-]+\.(js|css)$/.test(relative)
    )
      return reply.code(404).send({ error: "文件不存在" });
    try {
      const body = await readFile(path.join(root, relative));
      const html = relative === "index.html";
      reply.header(
        "Cache-Control",
        html ? "no-store" : "public, max-age=31536000, immutable",
      );
      reply.header("X-Content-Type-Options", "nosniff");
      return reply
        .type(
          html
            ? "text/html; charset=utf-8"
            : relative.endsWith(".js")
              ? "text/javascript; charset=utf-8"
              : "text/css; charset=utf-8",
        )
        .send(body);
    } catch {
      return reply.code(404).send({ error: "管理页面不可用，请检查服务构建" });
    }
  });
}
