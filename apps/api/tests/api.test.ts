import { beforeAll, afterAll, describe, it, expect } from "vitest";
import postgres from "postgres";
import { readFile } from "node:fs/promises";
import { createApp } from "../src/app";
import { connect } from "../src/db/client";
import * as t from "../src/db/schema";
import { hashPassword } from "../src/auth";
import { seedContents } from "../src/db/seed-data";
import { defaultHomeSections } from "@uh/domain";
import { defaultInsurancePolicy } from "../src/db/insurance-policy";
import { defaultTrainingCatalog } from "../src/db/training-catalog";
import { defaultBenefitPolicy } from "../src/db/benefit-policy";
const adminClient = postgres(
  process.env.TEST_DATABASE_URL ||
    "postgres://uh:uh_local_only@127.0.0.1:5438/postgres",
  { max: 1 },
);
const database = "uh_test_" + crypto.randomUUID().replaceAll("-", "");
let connection: ReturnType<typeof connect>;
let app: Awaited<ReturnType<typeof createApp>>;
let cookie = "";
let contentId = "";
const origin = "http://localhost:3071";
const password = "integration-test-password";
const headers = () => ({ cookie, origin, "x-uh-admin": "1" });
const draft = () => ({
  ...structuredClone(seedContents[5].draft),
  title: "用于验证发布隔离的失业保险金文章",
  reviewDueAt: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
});
const body = (res: { json: () => unknown }) =>
  (res.json() as { data: any }).data;
beforeAll(async () => {
  await adminClient.unsafe(`CREATE DATABASE ${database}`);
  const url = new URL(
    process.env.TEST_DATABASE_URL ||
      "postgres://uh:uh_local_only@127.0.0.1:5438/postgres",
  );
  url.pathname = "/" + database;
  connection = connect(url.toString());
  await connection.client.unsafe(
    await readFile(
      new URL("../drizzle/0001_initial.sql", import.meta.url),
      "utf8",
    ),
  );
  await connection.client.unsafe(await readFile(new URL("../drizzle/0002_mini_accounts.sql", import.meta.url), "utf8"));
  await connection.db.insert(t.admins).values([
    { username: "admin", passwordHash: hashPassword(password), role: "admin" },
    {
      username: "editor",
      passwordHash: hashPassword(password),
      role: "editor",
    },
  ]);
  app = await createApp(connection.db, {
    DATABASE_URL: url.toString(),
    HOST: "127.0.0.1",
    PORT: 3070,
    ADMIN_USERNAME: "admin",
    ADMIN_PASSWORD: password,
    ADMIN_ORIGINS: origin,
    NODE_ENV: "test",
  });
});
afterAll(async () => {
  await app?.close();
  await connection?.client.end();
  await adminClient.unsafe(`DROP DATABASE IF EXISTS ${database}`);
  await adminClient.end();
});
describe("公开内容与后台安全（真实 PostgreSQL）", () => {
  it("健康检查连接真实数据库", async () =>
    expect((await app.inject("/api/health/ready")).statusCode).toBe(200));
  it("未登录不能读取后台", async () =>
    expect((await app.inject("/api/v1/admin/contents")).statusCode).toBe(401));
  it("错误来源不能登录", async () =>
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/v1/admin/login",
          headers: { origin: "https://wrong.example" },
          payload: { username: "admin", password },
        })
      ).statusCode,
    ).toBe(403));
  it("密码错误不会建立会话", async () =>
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/v1/admin/login",
          headers: { origin },
          payload: { username: "admin", password: "wrong" },
        })
      ).statusCode,
    ).toBe(401));
  it("管理登录使用 HttpOnly cookie", async () => {
    const result = await app.inject({
      method: "POST",
      url: "/api/v1/admin/login",
      headers: { origin },
      payload: { username: "admin", password },
    });
    expect(result.statusCode).toBe(200);
    expect(result.headers["set-cookie"]).toContain("HttpOnly");
    cookie = String(result.headers["set-cookie"]).split(";")[0];
  });
  it("跨站写入被拒绝", async () =>
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/v1/admin/contents",
          headers: {
            cookie,
            origin: "https://wrong.example",
            "x-uh-admin": "1",
          },
          payload: draft(),
        })
      ).statusCode,
    ).toBe(403));
  it("无效/HTML正文被拒绝", async () =>
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/v1/admin/contents",
          headers: headers(),
          payload: { ...draft(), markdown: "<script>alert(1)</script>" },
        })
      ).statusCode,
    ).toBe(400));
  it("创建的草稿不对公众可见", async () => {
    const result = await app.inject({
      method: "POST",
      url: "/api/v1/admin/contents",
      headers: headers(),
      payload: draft(),
    });
    expect(result.statusCode).toBe(200);
    contentId = body(result).id;
    expect((await app.inject("/api/v1/contents/" + contentId)).statusCode).toBe(
      404,
    );
  });
  it("未审核草稿不能直接发布", async () =>
    expect(
      (
        await app.inject({
          method: "POST",
          url: `/api/v1/admin/contents/${contentId}/publish`,
          headers: headers(),
          payload: { baseVersion: 1 },
        })
      ).statusCode,
    ).toBe(409));
  it("审核并发布后只对适用地区可见", async () => {
    expect(
      (
        await app.inject({
          method: "POST",
          url: `/api/v1/admin/contents/${contentId}/submit`,
          headers: headers(),
          payload: { baseVersion: 1 },
        })
      ).statusCode,
    ).toBe(200);
    expect(
      (
        await app.inject({
          method: "POST",
          url: `/api/v1/admin/contents/${contentId}/publish`,
          headers: headers(),
          payload: { baseVersion: 1 },
        })
      ).statusCode,
    ).toBe(200);
    expect(
      body(await app.inject("/api/v1/contents?region=national")).items,
    ).toHaveLength(0);
    expect(
      body(await app.inject("/api/v1/contents?region=310000")).items,
    ).toHaveLength(1);
  });
  it("失业金别名能搜到失业保险金，补助金不混用", async () => {
    expect(
      body(
        await app.inject(
          "/api/v1/search?region=310000&q=" + encodeURIComponent("失业金"),
        ),
      ).items,
    ).toHaveLength(1);
    expect(
      body(
        await app.inject(
          "/api/v1/search?region=310000&q=" + encodeURIComponent("失业补助金"),
        ),
      ).items,
    ).toHaveLength(0);
  });
  it("修改草稿后已发布版本保持不变", async () => {
    const result = await app.inject({
      method: "PUT",
      url: "/api/v1/admin/contents/" + contentId,
      headers: headers(),
      payload: {
        baseVersion: 1,
        draft: { ...draft(), title: "尚未发布的修改标题" },
      },
    });
    expect(result.statusCode).toBe(200);
    expect(body(await app.inject("/api/v1/contents/" + contentId)).title).toBe(
      draft().title,
    );
  });
  it("旧草稿版本覆盖写入被拒绝", async () =>
    expect(
      (
        await app.inject({
          method: "PUT",
          url: "/api/v1/admin/contents/" + contentId,
          headers: headers(),
          payload: { baseVersion: 1, draft: draft() },
        })
      ).statusCode,
    ).toBe(409));
  it("编辑角色不能发布", async () => {
    const result = await app.inject({
      method: "POST",
      url: "/api/v1/admin/login",
      headers: { origin },
      payload: { username: "editor", password },
    });
    const editorCookie = String(result.headers["set-cookie"]).split(";")[0];
    expect(
      (
        await app.inject({
          method: "POST",
          url: `/api/v1/admin/contents/${contentId}/publish`,
          headers: { cookie: editorCookie, origin, "x-uh-admin": "1" },
          payload: { baseVersion: 2 },
        })
      ).statusCode,
    ).toBe(403);
  });
  it("撤回后详情和列表都不再提供内容", async () => {
    expect(
      (
        await app.inject({
          method: "POST",
          url: `/api/v1/admin/contents/${contentId}/withdraw`,
          headers: headers(),
          payload: { baseVersion: 2 },
        })
      ).statusCode,
    ).toBe(200);
    expect((await app.inject("/api/v1/contents/" + contentId)).statusCode).toBe(
      404,
    );
    expect(
      body(await app.inject("/api/v1/contents?region=310000")).items,
    ).toHaveLength(0);
  });
  it("反馈写入后可以处理并留下审计", async () => {
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/v1/feedback",
          payload: { message: "这篇内容中的来源日期需要再核查" },
        })
      ).statusCode,
    ).toBe(200);
    const records = body(
      await app.inject({ url: "/api/v1/admin/feedback", headers: headers() }),
    );
    expect(records).toHaveLength(1);
    expect(
      (
        await app.inject({
          method: "POST",
          url: `/api/v1/admin/feedback/${records[0].id}/resolve`,
          headers: headers(),
        })
      ).statusCode,
    ).toBe(200);
    expect(
      body(
        await app.inject({ url: "/api/v1/admin/audit", headers: headers() }),
      ).some((a: any) => a.action === "feedback_resolve"),
    ).toBe(true);
  });
  it("工具可以从后台停用", async () => {
    expect(
      (
        await app.inject({
          method: "PUT",
          url: "/api/v1/admin/settings",
          headers: headers(),
          payload: { disabledTools: ["budget", "benefit-calculator"] },
        })
      ).statusCode,
    ).toBe(200);
    expect(
      body(await app.inject("/api/v1/tools")).some(
        (t: any) => t.id === "budget",
      ),
    ).toBe(false);
    expect(
      body(await app.inject("/api/v1/tools")).some(
        (t: any) => t.id === "benefit-calculator",
      ),
    ).toBe(false);
  });
  it("首页配置支持新增、排序、隐藏、移除以及空宫格", async () => {
    const initial = body(await app.inject("/api/v1/home-sections"));
    expect(initial[0].destination).toBe("benefit-center");
    const added = {
      ...defaultHomeSections[0],
      id: "new-section",
      title: "生活安排",
      destination: "living",
    };
    const changed = [
      added,
      { ...defaultHomeSections[1], enabled: false },
      defaultHomeSections[2],
    ];
    expect(
      (
        await app.inject({
          method: "PUT",
          url: "/api/v1/admin/home-sections",
          headers: headers(),
          payload: changed,
        })
      ).statusCode,
    ).toBe(200);
    expect(
      body(await app.inject("/api/v1/home-sections")).map((s: any) => s.id),
    ).toEqual(["new-section", "insurance"]);
    expect(
      body(
        await app.inject({
          url: "/api/v1/admin/home-sections",
          headers: headers(),
        }),
      ),
    ).toHaveLength(3);
    await app.inject({
      method: "PUT",
      url: "/api/v1/admin/home-sections",
      headers: headers(),
      payload: [],
    });
    expect(body(await app.inject("/api/v1/home-sections"))).toEqual([]);
  });
  it("拒绝重复板块和任意路由跳转，配置不受失败写入影响", async () => {
    for (const payload of [
      [defaultHomeSections[0], defaultHomeSections[0]],
      [{ ...defaultHomeSections[0], destination: "https://evil.example" }],
    ])
      expect(
        (
          await app.inject({
            method: "PUT",
            url: "/api/v1/admin/home-sections",
            headers: headers(),
            payload,
          })
        ).statusCode,
      ).toBe(400);
    expect(body(await app.inject("/api/v1/home-sections"))).toEqual([]);
  });
  it("全国模式不套用上海失业金标准，地区参数需有效", async () => {
    expect(
      body(await app.inject("/api/v1/benefit-policy?region=national")),
    ).toEqual({ policy: null, state: null });
    expect(
      body(await app.inject("/api/v1/benefit-policy?region=310000")).policy
        .firstYearMonthlyCents,
    ).toBe(234000);
    expect(
      (await app.inject("/api/v1/benefit-policy?region=wrong")).statusCode,
    ).toBe(400);
  });
  it("政策更新同步到公开数据并审计，失效政策不再标为现行", async () => {
    const changed = {
      ...defaultBenefitPolicy,
      firstYearMonthlyCents: 235000,
      reviewDueAt: "2026-10-21",
    };
    // 复核日期早于核查日期不能保存。
    expect(
      (
        await app.inject({
          method: "PUT",
          url: "/api/v1/admin/benefit-policy",
          headers: headers(),
          payload: changed,
        })
      ).statusCode,
    ).toBe(400);
    changed.reviewDueAt = "2026-11-21";
    expect(
      (
        await app.inject({
          method: "PUT",
          url: "/api/v1/admin/benefit-policy",
          headers: headers(),
          payload: changed,
        })
      ).statusCode,
    ).toBe(200);
    expect(
      body(await app.inject("/api/v1/benefit-policy?region=310000")).policy
        .firstYearMonthlyCents,
    ).toBe(235000);
    const expired = {
      ...changed,
      effectiveFrom: "2020-01-01",
      effectiveTo: "2020-12-31",
    };
    await app.inject({
      method: "PUT",
      url: "/api/v1/admin/benefit-policy",
      headers: headers(),
      payload: expired,
    });
    expect(
      body(await app.inject("/api/v1/benefit-policy?region=310000")).state,
    ).toBe("expired");
    expect(
      body(
        await app.inject({ url: "/api/v1/admin/audit", headers: headers() }),
      ).some((a: any) => a.action === "benefit-policy_update"),
    ).toBe(true);
  });
  it("未登录和编辑角色不能发布板块或政策", async () => {
    const login = await app.inject({
      method: "POST",
      url: "/api/v1/admin/login",
      headers: { origin },
      payload: { username: "editor", password },
    });
    const editorCookie = String(login.headers["set-cookie"]).split(";")[0];
    for (const [path, payload] of [
      ["home-sections", []],
      ["benefit-policy", defaultBenefitPolicy],
    ] as const) {
      expect(
        (
          await app.inject({
            method: "PUT",
            url: "/api/v1/admin/" + path,
            payload,
          })
        ).statusCode,
      ).toBe(401);
      expect(
        (
          await app.inject({
            method: "PUT",
            url: "/api/v1/admin/" + path,
            headers: { cookie: editorCookie, origin, "x-uh-admin": "1" },
            payload,
          })
        ).statusCode,
      ).toBe(403);
    }
  });
  it("城市政策草稿与发布隔离，未开放城市不泄露", async () => {
    expect((await app.inject("/api/v1/benefit-policy?region=110000")).statusCode).toBe(400);
    const policy = {...structuredClone(defaultInsurancePolicy),cityId:"990001",cityName:"测试城市",reviewDueAt:"2099-01-01"};
    const put=(publish:boolean)=>app.inject({method:"PUT",url:"/api/v1/admin/insurance-policies/990001",headers:headers(),payload:{policy,publish}});
    expect((await put(false)).statusCode).toBe(200);
    expect((await app.inject("/api/v1/insurance-policy/990001")).statusCode).toBe(404);
    expect(body(await app.inject("/api/v1/insurance-cities")).map((c:any)=>c.cityId)).toEqual(["310000"]);
    expect((await put(true)).statusCode).toBe(200);
    expect(body(await app.inject("/api/v1/insurance-policy/990001")).cityName).toBe("测试城市");
    policy.cityName="待发布修改";await put(false);
    expect(body(await app.inject("/api/v1/insurance-policy/990001")).cityName).toBe("测试城市");
    expect(body(await app.inject("/api/v1/insurance-policy/310000")).base.minCents).toBe(754600);
    policy.enabled=false;await put(true);
    expect((await app.inject("/api/v1/insurance-policy/990001")).statusCode).toBe(404);
    expect(body(await app.inject({url:"/api/v1/admin/audit",headers:headers()})).some((a:any)=>a.action==="insurance_publish")).toBe(true);
  });
  it("城市发布校验来源及城市标识，未登录和编辑不能发布", async () => {
    const payload={policy:defaultInsurancePolicy,publish:true};
    const url="/api/v1/admin/insurance-policies/310000";
    expect((await app.inject({method:"PUT",url,payload,headers:{origin,"x-uh-admin":"1"}})).statusCode).toBe(401);
    const login=await app.inject({method:"POST",url:"/api/v1/admin/login",headers:{origin},payload:{username:"editor",password}});
    expect((await app.inject({method:"PUT",url,payload,headers:{cookie:String(login.headers["set-cookie"]).split(";")[0],origin,"x-uh-admin":"1"}})).statusCode).toBe(403);
    expect((await app.inject({method:"PUT",url:url.replace("310000","990002"),payload,headers:headers()})).statusCode).toBe(400);
    expect((await app.inject({method:"PUT",url,payload:{...payload,policy:{...defaultInsurancePolicy,sources:[]}},headers:headers()})).statusCode).toBe(400);
  });

  it("登出令会话立即失效", async () => {
    await app.inject({
      method: "POST",
      url: "/api/v1/admin/logout",
      headers: headers(),
    });
    expect(
      (await app.inject({ url: "/api/v1/admin/me", headers: headers() }))
        .statusCode,
    ).toBe(401);
  });

});

describe("培训目录独立发布", () => {
  beforeAll(async () => {
    const result = await app.inject({method:"POST",url:"/api/v1/admin/login",headers:{origin},payload:{username:"admin",password}});
    cookie = String(result.headers["set-cookie"]).split(";")[0];
  });
  it("上海目录可读，其他城市不能套用上海数据", async () => {
    const result = await app.inject("/api/v1/training-catalog?region=310000");
    expect(result.statusCode).toBe(200);
    expect(body(result).projects).toHaveLength(9);
    expect((await app.inject("/api/v1/training-catalog?region=110000")).statusCode).toBe(400);
  });
  it("未登录不能维护培训目录", async () => {
    expect((await app.inject({method:"PUT",url:"/api/v1/admin/training-catalog",headers:{origin,"x-uh-admin":"1"},payload:{}})).statusCode).toBe(401);
  });
  it("编辑角色不能维护政策目录，失效来源不能发布", async () => {
    const login = await app.inject({method:"POST",url:"/api/v1/admin/login",headers:{origin},payload:{username:"editor",password}});
    const payload = {catalog:defaultTrainingCatalog,publish:true,baseVersion:1};
    expect((await app.inject({method:"PUT",url:"/api/v1/admin/training-catalog",headers:{cookie:String(login.headers["set-cookie"]).split(";")[0],origin,"x-uh-admin":"1"},payload})).statusCode).toBe(403);
    const invalid = structuredClone(defaultTrainingCatalog); invalid.projects[0].sourceIds = ["missing"];
    expect((await app.inject({method:"PUT",url:"/api/v1/admin/training-catalog",headers:headers(),payload:{...payload,catalog:invalid}})).statusCode).toBe(400);
  });
  it("保存草稿不影响公开目录，版本冲突不会覆盖已有修改", async () => {
    const old = body(await app.inject({url:"/api/v1/admin/training-catalog",headers:headers()}));
    const catalog = structuredClone(defaultTrainingCatalog);
    catalog.projects[0].title = "仅草稿中的职业名称";
    const result = await app.inject({method:"PUT",url:"/api/v1/admin/training-catalog",headers:headers(),payload:{catalog,publish:false,baseVersion:old.version}});
    expect(result.statusCode).toBe(200);
    expect(body(result).version).toBe(old.version + 1);
    expect(body(await app.inject("/api/v1/training-catalog")).projects[0].title).not.toBe(catalog.projects[0].title);
    expect((await app.inject({method:"PUT",url:"/api/v1/admin/training-catalog",headers:headers(),payload:{catalog,publish:true,baseVersion:old.version}})).statusCode).toBe(409);
  });
  it("发布后更新公开版本，隐藏项目和整模块均可生效", async () => {
    let old = body(await app.inject({url:"/api/v1/admin/training-catalog",headers:headers()}));
    const catalog = structuredClone(defaultTrainingCatalog);
    catalog.projects[0].enabled = false;
    expect((await app.inject({method:"PUT",url:"/api/v1/admin/training-catalog",headers:headers(),payload:{catalog,publish:true,baseVersion:old.version}})).statusCode).toBe(200);
    expect(body(await app.inject("/api/v1/training-catalog")).projects.some((p:any)=>p.id === catalog.projects[0].id)).toBe(false);
    old = body(await app.inject({url:"/api/v1/admin/training-catalog",headers:headers()}));
    catalog.enabled = false;
    expect((await app.inject({method:"PUT",url:"/api/v1/admin/training-catalog",headers:headers(),payload:{catalog,publish:true,baseVersion:old.version}})).statusCode).toBe(200);
    expect((await app.inject("/api/v1/training-catalog")).statusCode).toBe(404);
  });
});
