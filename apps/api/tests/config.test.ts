import { expect, it } from "vitest";
import { readConfig } from "../src/config";

const base = { DATABASE_URL: "postgres://uh:local@localhost/unemployment_hub" };
const gateway = "a".repeat(64);
it("生产配置只需数据库连接与 padmin 密钥，不要求独立后台账号", () => {
  const config = readConfig({ ...base, NODE_ENV: "production", PADMIN_GATEWAY_SECRET: gateway });
  expect(config.ADMIN_PASSWORD).toBeUndefined();
  expect(config.PADMIN_GATEWAY_SECRET).toBe(gateway);
});
it("生产缺少 padmin 密钥时，即使配置独立后台密码也不能启动", () => {
  expect(() => readConfig({ ...base, NODE_ENV: "production", ADMIN_PASSWORD: "a".repeat(24) })).toThrow();
});
it("开发环境保留显式配置的编辑器调试登录", () => {
  expect(readConfig({ ...base, ADMIN_PASSWORD: "a".repeat(24) }).ADMIN_PASSWORD).toHaveLength(24);
});
it("拒绝无任何管理凭据和过短管理密钥", () => {
  expect(() => readConfig(base)).toThrow();
  expect(() => readConfig({ ...base, NODE_ENV: "production", PADMIN_GATEWAY_SECRET: "short" })).toThrow();
});
