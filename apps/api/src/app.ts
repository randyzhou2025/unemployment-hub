import Fastify from "fastify";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import { randomBytes, randomUUID } from "node:crypto";
import { and, eq, gt, sql, desc } from "drizzle-orm";
import { z, ZodError } from "zod";
import {
  draftSchema,
  querySchema,
  feedbackSchema,
  sourceSchema,
  homeSectionsSchema,
  benefitPolicySchema,
  benefitPolicyState,
  insuranceSaveSchema,
  trainingSaveSchema,
  type TrainingRecord,
  type InsuranceRecord,
  type Content,
  type ContentSummary,
} from "@uh/contracts";
import {
  stages,
  regions,
  issues,
  tools,
  defaultHomeSections,
} from "@uh/domain";
import { defaultInsuranceRecords } from "./db/insurance-policy.js";
import { defaultTrainingRecord } from "./db/training-catalog.js";
import { defaultBenefitPolicy } from "./db/benefit-policy.js";
import type { Database } from "./db/client.js";
import * as t from "./db/schema.js";
import type { Config } from "./config.js";
import { hashPassword, verifyPassword, tokenHash } from "./auth.js";
import { registerAccountRoutes, registerAccountAdmin, type AccountDependencies } from "./accounts.js";
import { createGatewayVerifier } from "./padmin-gateway.js";
import { parseMarkdown } from "./markdown.js";
import { registerWorkbench } from "./workbench.js";

function problem(statusCode: number, message: string) {
  return Object.assign(new Error(message), { statusCode });
}
function summary(c: Content): ContentSummary {
  const { markdown, body, tasks, sourceRefs, keyPoints, ...rest } = c;
  return rest;
}
function visible(c: Content): Content {
  const today = new Date().toISOString().slice(0, 10);
  return {
    ...c,
    verificationState:
      c.reviewDueAt < today || (c.effectiveTo && c.effectiveTo < today)
        ? "needs_review"
        : c.verificationState,
  };
}
export async function createApp(db: Database, config: Config, accountDeps: AccountDependencies = {}) {
  const app = Fastify({
    logger: config.NODE_ENV === "production",
    bodyLimit: 120000,
    trustProxy: config.NODE_ENV === "production",
    requestIdHeader: false,
  });
  await app.register(cookie);
  await app.register(rateLimit, {
    global: true,
    max: 180,
    timeWindow: "1 minute",
  });
  const ok = (data: unknown, requestId: string) => ({
    data,
    meta: { requestId },
  });
  app.setErrorHandler((error, req, reply) => {
    const validation = error instanceof ZodError;
    const status = validation
      ? 400
      : (error as { statusCode?: number }).statusCode || 500;
    if (status >= 500) req.log.error(error);
    reply.code(status).send({
      code: validation
        ? "VALIDATION"
        : status === 409
          ? "CONFLICT"
          : status === 401
            ? "UNAUTHORIZED"
            : status === 404
              ? "NOT_FOUND"
              : "REQUEST_FAILED",
      message: validation
        ? "请检查填写内容"
        : status >= 500
          ? "服务暂时不可用，请稍后重试"
          : (error as Error).message,
      requestId: req.id,
      ...(validation ? { fieldErrors: error.flatten().fieldErrors } : {}),
    });
  });
  app.get("/api/health/live", async () => ({ status: "ok" }));
  app.get("/api/health/ready", async () => {
    await db.execute(sql`SELECT 1`);
    return { status: "ready" };
  });
  registerWorkbench(app);
  async function current(id: string) {
    const rows = await db
      .select({ snapshot: t.revisions.snapshot })
      .from(t.contents)
      .innerJoin(
        t.revisions,
        and(
          eq(t.contents.id, t.revisions.contentId),
          eq(t.contents.currentRevision, t.revisions.revision),
        ),
      )
      .where(and(eq(t.contents.id, id), eq(t.contents.withdrawn, 0)))
      .limit(1);
    if (!rows.length) throw problem(404, "内容暂未发布或已撤回");
    return visible(rows[0].snapshot);
  }
  app.get("/api/v1/bootstrap", async (req) => {
    const [setting] = await db
      .select()
      .from(t.config)
      .where(eq(t.config.key, "disabledTools"));
    return ok(
      { stages, regions, issues, tools, disabledTools: setting?.value || [] },
      req.id,
    );
  });
  async function readSetting(key: string, fallback: unknown) {
    const [row] = await db.select().from(t.config).where(eq(t.config.key, key));
    return row ? row.value : fallback;
  }
  app.get("/api/v1/home-sections", async (req) => {
    const sections = homeSectionsSchema.parse(
      await readSetting("homeSections", defaultHomeSections),
    );
    return ok(
      sections.filter((s) => s.enabled),
      req.id,
    );
  });
  app.get("/api/v1/benefit-policy", async (req) => {
    const { region } = z.object({ region: z.enum(["national", "310000"]).default("national") }).parse(req.query);
    if (region === "national") return ok({ policy: null, state: null }, req.id);
    const policy = benefitPolicySchema.parse(
      await readSetting("benefitPolicy:310000", defaultBenefitPolicy),
    );
    return ok(
      {
        policy,
        state: benefitPolicyState(
          policy,
          new Date().toISOString().slice(0, 10),
        ),
      },
      req.id,
    );
  });
  async function trainingRecord() {
    return await readSetting("trainingCatalog:310000", defaultTrainingRecord) as TrainingRecord;
  }
  app.get("/api/v1/training-catalog", async (req) => {
    z.object({ region: z.literal("310000").default("310000") }).parse(req.query);
    const catalog = (await trainingRecord()).published;
    if (!catalog?.enabled) throw problem(404, "上海培训补贴项目暂未开放，请稍后再试");
    return ok({ ...catalog, projects: catalog.projects.filter(p => p.enabled) }, req.id);
  });
  async function insuranceRecords() {
    return await readSetting("insurancePolicies", defaultInsuranceRecords) as InsuranceRecord[];
  }
  app.get("/api/v1/insurance-cities", async (req) => ok((await insuranceRecords()).flatMap(r => r.published?.enabled ? [{ cityId: r.published.cityId, cityName: r.published.cityName }] : []), req.id));
  app.get("/api/v1/insurance-policy/:cityId", async (req) => {
    const cityId = z.string().regex(/^\d{6}$/).parse((req.params as {cityId:string}).cityId);
    const policy = (await insuranceRecords()).find(r => r.published?.cityId === cityId)?.published;
    if (!policy?.enabled) throw problem(404, "暂无该城市的参保信息，请选择其他城市");
    return ok(policy, req.id);
  });
  const list = async (query: unknown) => {
    const q = querySchema.parse(query);
    const parts = [
      eq(t.contents.withdrawn, 0),
      gt(t.contents.currentRevision, 0),
    ];
    const snap = t.revisions.snapshot;
    parts.push(
      sql`(${snap}->>'scope'='national' OR ${snap}->'regionIds' ? ${q.region})`,
    );
    if (q.stage) parts.push(sql`${snap}->'stageKeys' ? ${q.stage}`);
    if (q.issue) parts.push(sql`${snap}->'issueKeys' ? ${q.issue}`);
    if (q.kind) parts.push(sql`${snap}->>'kind'=${q.kind}`);
    if (q.q.trim()) {
      const alias: Record<string, string> = {
        失业金: "失业保险金",
        医保: "医保",
        培训补贴: "培训",
      };
      const term = (alias[q.q.trim()] || q.q.trim()).replace(/[\\%_]/g, "\\$&");
      parts.push(
        sql`(${snap}->>'title' ILIKE ${"%" + term + "%"} OR ${snap}->>'summary' ILIKE ${"%" + term + "%"})`,
      );
    }
    const rows = await db
      .select({ snapshot: snap })
      .from(t.contents)
      .innerJoin(
        t.revisions,
        and(
          eq(t.contents.id, t.revisions.contentId),
          eq(t.contents.currentRevision, t.revisions.revision),
        ),
      )
      .where(and(...parts))
      .orderBy(desc(t.revisions.createdAt), t.contents.id)
      .limit(q.limit + 1)
      .offset(q.cursor);
    return {
      items: rows.slice(0, q.limit).map((r) => summary(visible(r.snapshot))),
      nextCursor: rows.length > q.limit ? q.cursor + q.limit : null,
    };
  };
  app.get("/api/v1/contents", async (req) => ok(await list(req.query), req.id));
  app.get("/api/v1/search", async (req) => ok(await list(req.query), req.id));
  app.get<{ Params: { id: string } }>("/api/v1/contents/:id", async (req) =>
    ok(await current(req.params.id), req.id),
  );
  app.get<{ Params: { id: string } }>(
    "/api/v1/contents/:id/status",
    async (req) => {
      const c = await current(req.params.id);
      return ok(
        {
          id: c.id,
          revision: c.revision,
          status: c.status,
          verificationState: c.verificationState,
        },
        req.id,
      );
    },
  );
  for (const [route, kind] of [
    ["guides", "guide"],
    ["resources", "resource"],
  ] as const)
    app.get<{ Params: { id: string } }>(`/api/v1/${route}/:id`, async (req) => {
      const c = await current(req.params.id);
      if (c.kind !== kind) throw problem(404, "内容类型不匹配");
      return ok(c, req.id);
    });
  app.get("/api/v1/tools", async (req) => {
    const [setting] = await db
      .select()
      .from(t.config)
      .where(eq(t.config.key, "disabledTools"));
    return ok(
      tools.filter(
        (tool) => !((setting?.value as string[]) || []).includes(tool.id),
      ),
      req.id,
    );
  });
  app.post(
    "/api/v1/feedback",
    { config: { rateLimit: { max: 8, timeWindow: "1 hour" } } },
    async (req) => {
      const input = feedbackSchema.parse(req.body);
      await db.insert(t.feedbacks).values({ id: randomUUID(), ...input });
      return ok({ received: true }, req.id);
    },
  );

  registerAccountRoutes(app, db, config, accountDeps);
  const verifyGateway = createGatewayVerifier(config.PADMIN_GATEWAY_SECRET);
  const standaloneLogin = config.NODE_ENV !== "production" && !!config.ADMIN_PASSWORD;
  app.register(
    async (scope) => {
      scope.addHook("preHandler", async (req) => {
        if (req.url.split("?")[0] === "/api/v1/admin/login") {
          if (!standaloneLogin) throw problem(404, "请从 padmin 管理后台登录");
          return;
        }
        const gateway = verifyGateway(req);
        if (gateway) {
          (req as typeof req & {actor:typeof gateway}).actor = gateway;
          return;
        }
        if (!standaloneLogin) throw problem(401, "请从 padmin 管理后台登录");
        const token = req.cookies.uhb_admin;
        if (!token) throw problem(401, "请先登录后台");
        const [session] = await db
          .select({ username: t.admins.username, role: t.admins.role })
          .from(t.sessions)
          .innerJoin(t.admins, eq(t.sessions.username, t.admins.username))
          .where(
            and(
              eq(t.sessions.tokenHash, tokenHash(token)),
              gt(t.sessions.expiresAt, new Date()),
            ),
          )
          .limit(1);
        if (!session) throw problem(401, "登录已过期，请重新登录");
        (req as typeof req & { actor: typeof session }).actor = session;
        if (req.method !== "GET" && req.method !== "HEAD") {
          const origin = req.headers.origin;
          const allowed = config.ADMIN_ORIGINS.split(",");
          if (
            !origin ||
            !allowed.includes(origin) ||
            req.headers["x-uh-admin"] !== "1"
          )
            throw problem(403, "请求来源校验未通过");
        }
      });
      const actor = (req: unknown) =>
        (req as { actor: { username: string; role: string } }).actor;
      const permit = (req: unknown, publish = false) => {
        const a = actor(req);
        if (publish && !["admin", "reviewer"].includes(a.role))
          throw problem(403, "需要发布审核权限");
        return a.username;
      };
      registerAccountAdmin(scope, db, req => {
        if (actor(req).role !== "admin") throw problem(403, "需要管理员权限");
      });
      scope.post(
        "/login",
        { config: { rateLimit: { max: 8, timeWindow: "15 minutes" } } },
        async (req, reply) => {
          if (
            !req.headers.origin ||
            !config.ADMIN_ORIGINS.split(",").includes(req.headers.origin)
          )
            throw problem(403, "请求来源校验未通过");
          const input = z
            .object({
              username: z.string().max(80),
              password: z.string().max(200),
            })
            .parse(req.body);
          const [user] = await db
            .select()
            .from(t.admins)
            .where(eq(t.admins.username, input.username));
          if (
            !verifyPassword(
              input.password,
              user?.passwordHash || hashPassword("invalid-dummy-password"),
            ) ||
            !user
          )
            throw problem(401, "用户名或密码不正确");
          const token = randomBytes(32).toString("hex");
          await db.delete(t.sessions).where(sql`${t.sessions.expiresAt}<now()`);
          await db.insert(t.sessions).values({
            tokenHash: tokenHash(token),
            username: user.username,
            expiresAt: new Date(Date.now() + 8 * 3600000),
          });
          reply.setCookie("uhb_admin", token, {
            httpOnly: true,
            secure: config.NODE_ENV === "production",
            sameSite: "strict",
            path: "/api/v1/admin",
            maxAge: 28800,
          });
          return ok({ username: user.username, role: user.role }, req.id);
        },
      );
      scope.get("/me", async (req) => ok(actor(req), req.id));
      scope.post("/logout", async (req, reply) => {
        await db
          .delete(t.sessions)
          .where(eq(t.sessions.tokenHash, tokenHash(req.cookies.uhb_admin!)));
        reply.clearCookie("uhb_admin", { path: "/api/v1/admin" });
        return ok({ done: true }, req.id);
      });
      scope.get("/contents", async (req) =>
        ok(
          await db
            .select()
            .from(t.contents)
            .orderBy(desc(t.contents.updatedAt)),
          req.id,
        ),
      );
      scope.post("/contents", async (req) => {
        const input = draftSchema.parse(req.body);
        parseMarkdown(input.markdown);
        const id = randomUUID();
        const who = permit(req);
        await db.transaction(async (tx) => {
          await tx.insert(t.contents).values({ id, draft: input });
          await tx.insert(t.audit).values({
            id: randomUUID(),
            actor: who,
            action: "create",
            entityId: id,
          });
        });
        return ok({ id }, req.id);
      });
      scope.put<{ Params: { id: string } }>("/contents/:id", async (req) => {
        const input = z
          .object({ draft: draftSchema, baseVersion: z.number().int() })
          .parse(req.body);
        parseMarkdown(input.draft.markdown);
        const who = permit(req);
        await db.transaction(async (tx) => {
          const rows = await tx
            .update(t.contents)
            .set({
              draft: input.draft,
              draftVersion: input.baseVersion + 1,
              state: "draft",
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(t.contents.id, req.params.id),
                eq(t.contents.draftVersion, input.baseVersion),
              ),
            )
            .returning({ id: t.contents.id });
          if (!rows.length) throw problem(409, "草稿已被更新，请刷新后再编辑");
          await tx.insert(t.audit).values({
            id: randomUUID(),
            actor: who,
            action: "edit",
            entityId: req.params.id,
          });
        });
        return ok({ saved: true }, req.id);
      });
      scope.post("/preview", async (req) => {
        const input = draftSchema.parse(req.body);
        return ok({ body: parseMarkdown(input.markdown) }, req.id);
      });
      scope.post<{ Params: { id: string; action: string } }>(
        "/contents/:id/:action",
        async (req) => {
          const { id, action } = req.params;
          if (!["submit", "publish", "withdraw", "return"].includes(action))
            throw problem(404, "操作不存在");
          const { baseVersion } = z
            .object({ baseVersion: z.number().int() })
            .parse(req.body);
          const who = permit(req, action !== "submit");
          await db.transaction(async (tx) => {
            const rows = await tx
              .select()
              .from(t.contents)
              .where(eq(t.contents.id, id))
              .for("update");
            const row = rows[0];
            if (!row) throw problem(404, "内容不存在");
            if (row.draftVersion !== baseVersion)
              throw problem(409, "内容已更新，请刷新后重试");
            if (action === "publish") {
              if (row.state !== "review") throw problem(409, "请先提交审核");
              const draft = draftSchema.parse(row.draft);
              if (draft.reviewDueAt <= new Date().toISOString().slice(0, 10))
                throw problem(400, "复核日期必须晚于今天");
              if (draft.sourceRefs.some((s) => !s.verifiedAt))
                throw problem(400, "请先核查全部来源");
              const revision = row.currentRevision + 1;
              const snapshot: Content = {
                ...draft,
                id,
                revision,
                status: "published",
                verificationState: "verified",
                publishedAt: new Date().toISOString(),
                verifiedAt: new Date().toISOString(),
                body: parseMarkdown(draft.markdown),
              };
              await tx
                .insert(t.revisions)
                .values({ contentId: id, revision, snapshot });
              await tx
                .update(t.contents)
                .set({
                  state: "published",
                  currentRevision: revision,
                  withdrawn: 0,
                  updatedAt: new Date(),
                })
                .where(eq(t.contents.id, id));
            } else
              await tx
                .update(t.contents)
                .set(
                  action === "withdraw"
                    ? { withdrawn: 1, updatedAt: new Date() }
                    : {
                        state: action === "submit" ? "review" : "draft",
                        updatedAt: new Date(),
                      },
                )
                .where(eq(t.contents.id, id));
            await tx
              .insert(t.audit)
              .values({ id: randomUUID(), actor: who, action, entityId: id });
          });
          return ok({ done: true }, req.id);
        },
      );
      scope.get("/sources", async (req) =>
        ok(await db.select().from(t.sources), req.id),
      );
      scope.post("/sources", async (req) => {
        const input = sourceSchema.parse(req.body);
        await db.transaction(async (tx) => {
          await tx
            .insert(t.sources)
            .values({ id: input.id, data: input })
            .onConflictDoUpdate({ target: t.sources.id, set: { data: input } });
          await tx.insert(t.audit).values({
            id: randomUUID(),
            actor: permit(req),
            action: "source_edit",
            entityId: input.id,
          });
        });
        return ok(input, req.id);
      });
      scope.get("/audit", async (req) =>
        ok(
          await db
            .select()
            .from(t.audit)
            .orderBy(desc(t.audit.createdAt))
            .limit(100),
          req.id,
        ),
      );
      scope.get("/feedback", async (req) =>
        ok(
          await db
            .select()
            .from(t.feedbacks)
            .orderBy(desc(t.feedbacks.createdAt))
            .limit(200),
          req.id,
        ),
      );
      scope.post<{ Params: { id: string } }>(
        "/feedback/:id/resolve",
        async (req) => {
          await db.transaction(async (tx) => {
            await tx
              .update(t.feedbacks)
              .set({ state: "resolved" })
              .where(eq(t.feedbacks.id, req.params.id));
            await tx.insert(t.audit).values({
              id: randomUUID(),
              actor: permit(req),
              action: "feedback_resolve",
              entityId: req.params.id,
            });
          });
          return ok({ done: true }, req.id);
        },
      );
      scope.get("/settings", async (req) => {
        const [row] = await db
          .select()
          .from(t.config)
          .where(eq(t.config.key, "disabledTools"));
        return ok({ disabledTools: row?.value || [] }, req.id);
      });
      scope.get("/home-sections", async (req) =>
        ok(await readSetting("homeSections", defaultHomeSections), req.id),
      );
      scope.get("/benefit-policy", async (req) =>
        ok(
          await readSetting("benefitPolicy:310000", defaultBenefitPolicy),
          req.id,
        ),
      );
      scope.get("/training-catalog", async req => ok(await trainingRecord(), req.id));
      scope.put("/training-catalog", { bodyLimit: 300000 }, async req => {
        const who = permit(req, true);
        const { catalog, publish, baseVersion } = trainingSaveSchema.parse(req.body);
        if (publish && catalog.enabled && catalog.reviewDueAt < new Date().toISOString().slice(0, 10)) throw problem(400, "政策已到复核期，请实际核查后再发布");
        const next = await db.transaction(async tx => {
          await tx.execute(sql`SELECT pg_advisory_xact_lock(307024)`);
          const [row] = await tx.select().from(t.config).where(eq(t.config.key, "trainingCatalog:310000"));
          const old = (row?.value || defaultTrainingRecord) as TrainingRecord;
          if (old.version !== baseVersion) throw problem(409, "内容已被更新，请保留修改并重新加载后核对");
          const updated: TrainingRecord = { draft: catalog, published: publish ? catalog : old.published, version: old.version + 1 };
          await tx.insert(t.config).values({ key: "trainingCatalog:310000", value: updated }).onConflictDoUpdate({ target: t.config.key, set: { value: updated } });
          await tx.insert(t.audit).values({ id: randomUUID(), actor: who, action: publish ? "training_publish" : "training_draft", entityId: catalog.cityId });
          return updated;
        });
        return ok(next, req.id);
      });
      scope.get("/insurance-policies", async (req) => ok(await insuranceRecords(), req.id));
      scope.put("/insurance-policies/:cityId", async (req) => {
        const who = permit(req, true);
        const { policy, publish } = insuranceSaveSchema.parse(req.body);
        if (policy.cityId !== (req.params as {cityId:string}).cityId) throw problem(400, "城市标识不一致");
        if (publish && policy.enabled && policy.reviewDueAt < new Date().toISOString().slice(0, 10)) throw problem(400, "复核日期已过，请先实际核查后发布");
        await db.transaction(async tx => {
          // 同一配置行加锁，避免不同城市同时保存时相互覆盖。
          await tx.execute(sql`SELECT pg_advisory_xact_lock(307023)`);
          const [row] = await tx.select().from(t.config).where(eq(t.config.key, "insurancePolicies"));
          const records = (row?.value || defaultInsuranceRecords) as InsuranceRecord[];
          const old = records.find(r => r.draft.cityId === policy.cityId);
          const next = { draft: policy, published: publish ? policy : old?.published || null };
          const updated = [...records.filter(r => r.draft.cityId !== policy.cityId), next];
          if (updated.length > 100) throw problem(400, "城市数量超过维护上限");
          await tx.insert(t.config).values({key: "insurancePolicies", value: updated}).onConflictDoUpdate({target:t.config.key, set:{value:updated}});
          await tx.insert(t.audit).values({id:randomUUID(), actor:who, action:publish ? "insurance_publish" : "insurance_draft", entityId:policy.cityId});
        });
        return ok(true, req.id);
      });
      for (const kind of ["home-sections", "benefit-policy"] as const) {
        scope.put("/" + kind, async (req) => {
          const who = permit(req, true);
          const input =
            kind === "home-sections"
              ? homeSectionsSchema.parse(req.body)
              : benefitPolicySchema.parse(req.body);
          const key =
            kind === "home-sections" ? "homeSections" : "benefitPolicy:310000";
          await db.transaction(async (tx) => {
            await tx
              .insert(t.config)
              .values({ key, value: input })
              .onConflictDoUpdate({
                target: t.config.key,
                set: { value: input },
              });
            await tx
              .insert(t.audit)
              .values({
                id: randomUUID(),
                actor: who,
                action: kind + "_update",
                entityId: key,
              });
          });
          return ok(input, req.id);
        });
      }
      scope.put("/settings", async (req) => {
        const input = z
          .object({
            disabledTools: z.array(
              z.enum([
                "tasks",
                "budget",
                "applications",
                "resources",
                "benefit-calculator",
              ]),
            ),
          })
          .parse(req.body);
        const who = permit(req, true);
        await db.transaction(async (tx) => {
          await tx
            .insert(t.config)
            .values({ key: "disabledTools", value: input.disabledTools })
            .onConflictDoUpdate({
              target: t.config.key,
              set: { value: input.disabledTools },
            });
          await tx.insert(t.audit).values({
            id: randomUUID(),
            actor: who,
            action: "tools_update",
            entityId: "tools",
          });
        });
        return ok(input, req.id);
      });
    },
    { prefix: "/api/v1/admin" },
  );
  return app;
}
