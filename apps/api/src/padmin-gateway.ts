import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { FastifyRequest } from "fastify";
export function createGatewayVerifier(secret?: string) {
  const used = new Map<string, number>();
  return (req: FastifyRequest): { username: string; role: "admin" } | null => {
    if (!req.headers["x-uh-signature"]) return null;
    const reject = () => {
      throw Object.assign(new Error("管理连接校验失败"), { statusCode: 401 });
    };
    if (!secret) return reject();
    const header = (key: string) =>
      typeof req.headers[key] === "string" ? (req.headers[key] as string) : "";
    const timestamp = header("x-uh-time"),
      nonce = header("x-uh-nonce"),
      actor = header("x-uh-actor"),
      signature = header("x-uh-signature");
    const now = Date.now();
    if (
      !/^\d{13}$/.test(timestamp) ||
      Math.abs(now - Number(timestamp)) > 60000 ||
      !/^[a-f0-9]{32}$/.test(nonce) ||
      !/^[a-f0-9]{64}$/.test(signature)
    )
      return reject();
    for (const [key, expiry] of used) if (expiry < now) used.delete(key);
    if (used.has(nonce)) return reject();
    const hash = createHash("sha256")
      .update(JSON.stringify(req.body ?? null))
      .digest("hex");
    const expected = createHmac("sha256", secret)
      .update([timestamp, nonce, req.method, req.url, actor, hash].join("\n"))
      .digest();
    if (!timingSafeEqual(Buffer.from(signature, "hex"), expected))
      return reject();
    const username = Buffer.from(actor, "base64url").toString("utf8");
    if (!username || username.length > 200 || /[\r\n\x00]/.test(username))
      return reject();
    used.set(nonce, now + 120000);
    return { username, role: "admin" };
  };
}
