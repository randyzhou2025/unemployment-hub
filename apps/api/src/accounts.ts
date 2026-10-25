import type { FastifyInstance, FastifyRequest } from "fastify";
import { randomBytes, randomInt, randomUUID } from "node:crypto";
import { and, eq, gt, ilike, or, sql, desc } from "drizzle-orm";
import { z } from "zod";
import type { MiniAccount } from "@uh/contracts";
import type { Database } from "./db/client.js";
import type { Config } from "./config.js";
import * as t from "./db/schema.js";
import { tokenHash } from "./auth.js";
export type AccountDependencies = {
  resolveCode?: (code: string) => Promise<string>;
};
const failure = (statusCode: number, message: string) =>
  Object.assign(new Error(message), { statusCode });
export function shanghaiDay(time = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(time);
  const get = (type: string) => parts.find((v) => v.type === type)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}
const publicUser = (u: typeof t.miniUsers.$inferSelect): MiniAccount => ({
  id: u.id,
  nickname: u.nickname,
  createdAt: u.createdAt.toISOString(),
});
function nickname() {
  const first = [
      "晨",
      "晴",
      "青",
      "云",
      "山",
      "竹",
      "松",
      "星",
      "溪",
      "风",
      "暖",
      "春",
    ],
    last = [
      "川",
      "野",
      "林",
      "月",
      "光",
      "海",
      "舟",
      "岚",
      "岸",
      "泉",
      "屿",
      "雨",
    ];
  return first[randomInt(first.length)] + "间" + last[randomInt(last.length)];
}
async function resolveCode(config: Config, code: string) {
  if (!config.WECHAT_MINI_APPID || !config.WECHAT_MINI_SECRET)
    throw failure(503, "账号服务暂不可用");
  const url = new URL("https://api.weixin.qq.com/sns/jscode2session");
  url.search = new URLSearchParams({
    appid: config.WECHAT_MINI_APPID,
    secret: config.WECHAT_MINI_SECRET,
    js_code: code,
    grant_type: "authorization_code",
  }).toString();
  let data: { openid?: string; errcode?: number };
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error();
    data = (await res.json()) as typeof data;
  } catch {
    throw failure(503, "账号连接失败，请稍后重试");
  }
  if (
    data.errcode ||
    typeof data.openid !== "string" ||
    !data.openid ||
    data.openid.length > 128
  )
    throw failure(401, "登录已失效，请重试");
  return data.openid;
}
async function active(
  tx: Pick<Database, "insert" | "update">,
  userId: string,
  now: Date,
) {
  await tx
    .update(t.miniUsers)
    .set({ lastActiveAt: now })
    .where(eq(t.miniUsers.id, userId));
  await tx
    .insert(t.miniDailyActivity)
    .values({
      userId,
      day: shanghaiDay(now),
      firstSeenAt: now,
      lastSeenAt: now,
      visits: 1,
    })
    .onConflictDoUpdate({
      target: [t.miniDailyActivity.userId, t.miniDailyActivity.day],
      set: { lastSeenAt: now, visits: sql`${t.miniDailyActivity.visits} + 1` },
    });
}
export async function accountFromRequest(db: Database, req: FastifyRequest) {
  const token = req.headers.authorization?.replace(/^Bearer /, "") || "";
  if (!/^[a-f0-9]{64}$/.test(token)) throw failure(401, "请重新连接账号");
  const [row] = await db
    .select({ user: t.miniUsers })
    .from(t.miniSessions)
    .innerJoin(t.miniUsers, eq(t.miniSessions.userId, t.miniUsers.id))
    .where(
      and(
        eq(t.miniSessions.tokenHash, tokenHash(token)),
        gt(t.miniSessions.expiresAt, new Date()),
      ),
    )
    .limit(1);
  if (!row) throw failure(401, "登录已失效，请重新连接");
  return row.user;
}
export function registerAccountRoutes(
  app: FastifyInstance,
  db: Database,
  config: Config,
  deps: AccountDependencies = {},
) {
  const ok = (data: unknown, requestId: string) => ({
    data,
    meta: { requestId },
  });
  app.post(
    "/api/v1/account/session",
    { config: { rateLimit: { max: 12, timeWindow: "1 minute" } } },
    async (req, reply) => {
      const { code } = z
        .object({ code: z.string().trim().min(1).max(256) })
        .strict()
        .parse(req.body);
      const openid = await (deps.resolveCode
        ? deps.resolveCode(code)
        : resolveCode(config, code));
      const now = new Date(),
        expiresAt = new Date(now.getTime() + 30 * 86400000),
        token = randomBytes(32).toString("hex");
      const user = await db.transaction(async (tx) => {
        const [user] = await tx
          .insert(t.miniUsers)
          .values({
            id: randomUUID(),
            appId: config.WECHAT_MINI_APPID || "test-only",
            openid,
            nickname: nickname(),
            createdAt: now,
            lastActiveAt: now,
          })
          .onConflictDoUpdate({
            target: [t.miniUsers.appId, t.miniUsers.openid],
            set: { lastActiveAt: now },
          })
          .returning();
        await tx
          .insert(t.miniSessions)
          .values({ tokenHash: tokenHash(token), userId: user.id, expiresAt });
        await active(tx, user.id, now);
        return user;
      });
      reply.header("Cache-Control", "no-store");
      return ok(
        { token, expiresAt: expiresAt.toISOString(), user: publicUser(user) },
        req.id,
      );
    },
  );
  app.get("/api/v1/account/me", async (req, reply) => {
    reply.header("Cache-Control", "no-store");
    return ok({ user: publicUser(await accountFromRequest(db, req)) }, req.id);
  });
  app.post("/api/v1/account/activity", async (req, reply) => {
    z.object({})
      .strict()
      .parse(req.body ?? {});
    const user = await accountFromRequest(db, req);
    await db.transaction((tx) => active(tx, user.id, new Date()));
    reply.header("Cache-Control", "no-store");
    return ok({ user: publicUser(user) }, req.id);
  });
}
const paging = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
};
export function registerAccountAdmin(
  app: FastifyInstance,
  db: Database,
  authorize: (req: FastifyRequest) => void,
) {
  const ok = (data: unknown, requestId: string) => ({
    data,
    meta: { requestId },
  });
  app.get("/users", async (req, reply) => {
    authorize(req);
    const { page, pageSize, q } = z
      .object({ ...paging, q: z.string().trim().max(80).default("") })
      .parse(req.query);
    const where = q
      ? or(
          ilike(t.miniUsers.nickname, "%" + q + "%"),
          ilike(t.miniUsers.id, "%" + q + "%"),
        )
      : undefined;
    const day = shanghaiDay(),
      since = new Date(Date.now() - 6 * 86400000),
      week = shanghaiDay(since);
    const [users, [count], [stats]] = await Promise.all([
      db
        .select({
          id: t.miniUsers.id,
          nickname: t.miniUsers.nickname,
          createdAt: t.miniUsers.createdAt,
          lastActiveAt: t.miniUsers.lastActiveAt,
          openid: t.miniUsers.openid,
          activeDays: sql<number>`(select count(*)::int from mini_daily_activity a where a.user_id = ${t.miniUsers.id})`,
        })
        .from(t.miniUsers)
        .where(where)
        .orderBy(desc(t.miniUsers.createdAt), t.miniUsers.id)
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      db
        .select({ total: sql<number>`count(*)::int` })
        .from(t.miniUsers)
        .where(where),
      db
        .select({
          total: sql<number>`count(*)::int`,
          todayNew: sql<number>`count(*) filter (where to_char(${t.miniUsers.createdAt} at time zone 'Asia/Shanghai','YYYY-MM-DD')=${day})::int`,
          todayActive: sql<number>`(select count(*)::int from mini_daily_activity where day=${day})`,
          weekActive: sql<number>`(select count(distinct user_id)::int from mini_daily_activity where day>=${week} and day<=${day})`,
        })
        .from(t.miniUsers),
    ]);
    reply.header("Cache-Control", "no-store");
    return ok(
      {
        users: users.map((u) => ({
          id: u.id,
          nickname: u.nickname,
          createdAt: u.createdAt.toISOString(),
          lastActiveAt: u.lastActiveAt.toISOString(),
          activeDays: u.activeDays,
          openidMasked:
            u.openid.length > 8
              ? u.openid.slice(0, 4) + "***" + u.openid.slice(-4)
              : "***",
        })),
        total: count.total,
        page,
        pageSize,
        stats,
      },
      req.id,
    );
  });
  app.get("/activity", async (req, reply) => {
    authorize(req);
    const { page, pageSize, day } = z
      .object({ ...paging, day: z.string().date().default(shanghaiDay()) })
      .parse(req.query);
    const where = eq(t.miniDailyActivity.day, day);
    const [rows, [count]] = await Promise.all([
      db
        .select({ user: t.miniUsers, activity: t.miniDailyActivity })
        .from(t.miniDailyActivity)
        .innerJoin(t.miniUsers, eq(t.miniDailyActivity.userId, t.miniUsers.id))
        .where(where)
        .orderBy(desc(t.miniDailyActivity.lastSeenAt), t.miniUsers.id)
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      db
        .select({ total: sql<number>`count(*)::int` })
        .from(t.miniDailyActivity)
        .where(where),
    ]);
    reply.header("Cache-Control", "no-store");
    return ok(
      {
        day,
        users: rows.map((r) => ({
          user: publicUser(r.user),
          firstSeenAt: r.activity.firstSeenAt.toISOString(),
          lastSeenAt: r.activity.lastSeenAt.toISOString(),
          visits: r.activity.visits,
        })),
        total: count.total,
        page,
        pageSize,
      },
      req.id,
    );
  });
}
