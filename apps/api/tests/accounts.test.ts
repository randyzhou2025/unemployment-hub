import { beforeAll, afterAll, describe, it, expect } from "vitest";
import postgres from "postgres";
import { readFile } from "node:fs/promises";
import { createHash, createHmac, randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createApp } from "../src/app";
import { connect } from "../src/db/client";
import { shanghaiDay } from "../src/accounts";
import { hashPassword } from "../src/auth";
import { readConfig } from "../src/config";
import * as t from "../src/db/schema";

const base =
  process.env.TEST_DATABASE_URL ||
  "postgres://uh:uh_local_only@127.0.0.1:5438/postgres";
const root = postgres(base, { max: 1 });
const database = "uh_account_test_" + crypto.randomUUID().replaceAll("-", "");
const secret = randomBytes(32).toString("hex"),
  origin = "http://localhost:3071";
let connection: ReturnType<typeof connect>,
  app: Awaited<ReturnType<typeof createApp>>;
let databaseUrl = "";
const data = (r: { json: () => any }) => r.json().data;
const sign = (
  url: string,
  method = "GET",
  payload?: unknown,
  timestamp = String(Date.now()),
) => {
  const nonce = randomBytes(16).toString("hex"),
    actor = Buffer.from("padmin@example.test").toString("base64url");
  const hash = createHash("sha256")
    .update(JSON.stringify(payload ?? null))
    .digest("hex");
  const signature = createHmac("sha256", secret)
    .update([timestamp, nonce, method, url, actor, hash].join("\n"))
    .digest("hex");
  return {
    "x-uh-time": timestamp,
    "x-uh-nonce": nonce,
    "x-uh-actor": actor,
    "x-uh-signature": signature,
  };
};
beforeAll(async () => {
  await root.unsafe(`CREATE DATABASE ${database}`);
  const url = new URL(base);
  url.pathname = "/" + database;
  databaseUrl = url.toString();
  connection = connect(url.toString());
  for (const file of ["0001_initial.sql", "0002_mini_accounts.sql"])
    await connection.client.unsafe(
      await readFile(new URL("../drizzle/" + file, import.meta.url), "utf8"),
    );
  await connection.db
    .insert(t.admins)
    .values({
      username: "editor",
      passwordHash: hashPassword("test-password"),
      role: "editor",
    });
  app = await createApp(
    connection.db,
    {
      DATABASE_URL: url.toString(),
      HOST: "127.0.0.1",
      PORT: 3070,
      ADMIN_USERNAME: "admin",
      ADMIN_PASSWORD: "test-password",
      ADMIN_ORIGINS: origin,
      NODE_ENV: "test",
      WECHAT_MINI_APPID: "wx4705822b30adb794",
      PADMIN_GATEWAY_SECRET: secret,
    },
    {
      resolveCode: async (code) => {
        if (code === "invalid")
          throw Object.assign(new Error("登录已失效"), { statusCode: 401 });
        return "openid_fixture_" + code;
      },
    },
  );
});
afterAll(async () => {
  await app?.close();
  await connection?.client.end();
  await root.unsafe(`DROP DATABASE IF EXISTS ${database}`);
  await root.end();
});
describe("独立微信账号与基础活跃", () => {
  let token = "",
    id = "";
  it("同一微信身份并发连接只创建一个用户，返回会话不泄露微信标识", async () => {
    const results = await Promise.all(
      [1, 2, 3].map(() =>
        app.inject({
          method: "POST",
          url: "/api/v1/account/session",
          payload: { code: "same" },
        }),
      ),
    );
    expect(results.map((r) => r.statusCode)).toEqual([200, 200, 200]);
    const users = results.map((r) => data(r).user);
    expect(new Set(users.map((u) => u.id)).size).toBe(1);
    expect(new Set(users.map((u) => u.nickname)).size).toBe(1);
    token = data(results[0]).token;
    id = users[0].id;
    expect(token).toMatch(/^[a-f0-9]{64}$/);
    expect(results[0].body).not.toMatch(/openid|session_key|unionid/);
    const sessions = await connection.db.select().from(t.miniSessions);
    expect(sessions).toHaveLength(3);
    expect(sessions.some((s) => s.tokenHash === token)).toBe(false);
    expect(await connection.db.select().from(t.miniUsers)).toHaveLength(1);
  });
  it("连接和访问按上海自然日聚合，人数去重且次数累计", async () => {
    const result = await app.inject({
      method: "POST",
      url: "/api/v1/account/activity",
      headers: { authorization: "Bearer " + token },
      payload: {},
    });
    expect(result.statusCode).toBe(200);
    expect(data(result).user.id).toBe(id);
    const rows = await connection.db.select().from(t.miniDailyActivity);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ day: shanghaiDay(), visits: 4 });
    expect(shanghaiDay(new Date("2026-10-24T15:59:59Z"))).toBe("2026-10-24");
    expect(shanghaiDay(new Date("2026-10-24T16:00:00Z"))).toBe("2026-10-25");
  });
  it("拒绝个人记录上传、伪造会话和过期会话", async () => {
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/v1/account/activity",
          headers: { authorization: "Bearer " + token },
          payload: { budget: 1000 },
        })
      ).statusCode,
    ).toBe(400);
    expect(
      (
        await app.inject({
          url: "/api/v1/account/me",
          headers: { authorization: "Bearer " + "a".repeat(64) },
        })
      ).statusCode,
    ).toBe(401);
    await connection.db.update(t.miniSessions).set({ expiresAt: new Date(0) });
    expect(
      (
        await app.inject({
          url: "/api/v1/account/me",
          headers: { authorization: "Bearer " + token },
        })
      ).statusCode,
    ).toBe(401);
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/v1/account/session",
          payload: { code: "invalid" },
        })
      ).statusCode,
    ).toBe(401);
  });
  it("padmin 可读取分页、搜索和脱敏统计，编辑员无用户读取权限", async () => {
    const url = "/api/v1/admin/users?pageSize=1&q=" + id;
    const result = await app.inject({ url, headers: sign(url) });
    expect(result.statusCode).toBe(200);
    expect(data(result).total).toBe(1);
    expect(data(result).stats).toEqual({
      total: 1,
      todayNew: 1,
      todayActive: 1,
      weekActive: 1,
    });
    expect(data(result).users[0].openidMasked).toBe("open***same");
    expect(data(result).users[0]).not.toHaveProperty("openid");
    const daily = "/api/v1/admin/activity?day=" + shanghaiDay();
    expect(
      data(await app.inject({ url: daily, headers: sign(daily) })).users[0]
        .visits,
    ).toBe(4);
    const login = await app.inject({
      method: "POST",
      url: "/api/v1/admin/login",
      headers: { origin },
      payload: { username: "editor", password: "test-password" },
    });
    expect(
      (
        await app.inject({
          url: "/api/v1/admin/users",
          headers: {
            cookie: String(login.headers["set-cookie"]).split(";")[0],
          },
        })
      ).statusCode,
    ).toBe(403);
  });
});
describe("padmin 签名接入", () => {
  it("正常签名保留操作者，未登录与错误签名被拒绝", async () => {
    const url = "/api/v1/admin/me";
    expect((await app.inject(url)).statusCode).toBe(401);
    const headers = sign(url);
    expect(data(await app.inject({ url, headers }))).toEqual({
      username: "padmin@example.test",
      role: "admin",
    });
    expect(
      (
        await app.inject({
          url,
          headers: { ...sign(url), "x-uh-signature": "f".repeat(64) },
        })
      ).statusCode,
    ).toBe(401);
  });
  it("拒绝重放、过期时间、改动路径和改动请求体", async () => {
    const url = "/api/v1/admin/me",
      headers = sign(url);
    expect((await app.inject({ url, headers })).statusCode).toBe(200);
    expect((await app.inject({ url, headers })).statusCode).toBe(401);
    expect(
      (
        await app.inject({
          url,
          headers: sign(url, "GET", undefined, String(Date.now() - 120000)),
        })
      ).statusCode,
    ).toBe(401);
    expect(
      (await app.inject({ url: "/api/v1/admin/users", headers: sign(url) }))
        .statusCode,
    ).toBe(401);
    const target = "/api/v1/admin/settings";
    expect(
      (
        await app.inject({
          method: "PUT",
          url: target,
          headers: sign(target, "PUT", { disabledTools: [] }),
          payload: { disabledTools: ["budget"] },
        })
      ).statusCode,
    ).toBe(401);
  });
  it("签名写入沿用原有校验并留下 padmin 操作者审计", async () => {
    const url = "/api/v1/admin/settings",
      payload = { disabledTools: ["budget"] };
    expect(
      (
        await app.inject({
          method: "PUT",
          url,
          payload,
          headers: sign(url, "PUT", payload),
        })
      ).statusCode,
    ).toBe(200);
    const audit = "/api/v1/admin/audit";
    expect(
      data(await app.inject({ url: audit, headers: sign(audit) })).some(
        (r: any) => r.actor === "padmin@example.test",
      ),
    ).toBe(true);
  });
});

describe("生产只使用 padmin", () => {
  it("不配置独立后台账号也能启动，签名读写正常，直接登录被关闭", async () => {
    const production = await createApp(connection.db, readConfig({
      DATABASE_URL: databaseUrl, NODE_ENV: "production", PADMIN_GATEWAY_SECRET: secret,
    }));
    try {
      expect((await production.inject("/api/health/ready")).statusCode).toBe(200);
      expect((await production.inject({ method: "POST", url: "/api/v1/admin/login", payload: { username: "editor", password: "test-password" } })).statusCode).toBe(404);
      expect((await production.inject("/api/v1/admin/me")).statusCode).toBe(401);
      const url="/api/v1/admin/settings", payload={disabledTools:[]};
      expect((await production.inject({ method:"PUT", url, payload, headers:sign(url,"PUT",payload) })).statusCode).toBe(200);
      expect(data(await production.inject({url:"/api/v1/admin/me",headers:sign("/api/v1/admin/me")})).username).toBe("padmin@example.test");
    } finally { await production.close(); }
  });
  it("即使遗留账号与 Cookie 仍存在，生产也不能通过它们登录", async () => {
    const login=await app.inject({method:"POST",url:"/api/v1/admin/login",headers:{origin},payload:{username:"editor",password:"test-password"}});
    const production=await createApp(connection.db,readConfig({DATABASE_URL:databaseUrl,NODE_ENV:"production",PADMIN_GATEWAY_SECRET:secret,ADMIN_PASSWORD:"old-config-password"}));
    try {
      expect((await production.inject({url:"/api/v1/admin/me",headers:{cookie:String(login.headers["set-cookie"]).split(";")[0]}})).statusCode).toBe(401);
    } finally {await production.close();}
  });
  it("不配置管理员密码也能初始化政策内容，且不创建独立管理员", async () => {
    const before=await connection.db.select().from(t.admins);
    const seed=()=>execFileSync(process.execPath,["--import","tsx",fileURLToPath(new URL("../src/db/seed.ts",import.meta.url))],{env:{...process.env,DATABASE_URL:databaseUrl,ADMIN_PASSWORD:""},stdio:"pipe"});
    seed();
    expect(await connection.db.select().from(t.admins)).toEqual(before);
    expect((await connection.db.select().from(t.contents)).length).toBeGreaterThan(0);
    const first=await connection.db.select().from(t.audit);
    expect(first.some(a=>a.action==="seed_verified_content" && a.actor==="system")).toBe(true);
    seed();
    expect(await connection.db.select().from(t.audit)).toHaveLength(first.length);
  });
});
