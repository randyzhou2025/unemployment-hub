import { z } from "zod";
const date = z.string().date();
const text = z.string().trim().min(2).max(500);
export const insuranceRouteIds = [
  "benefit-medical",
  "benefit-pension",
  "flexible",
  "resident",
  "employed",
] as const;
const windowFields = {
  from: date,
  to: date.nullable(),
  sourceId: z.string().min(1),
};
const rate = z.object({
  ...windowFields,
  bps: z.number().int().min(0).max(10000),
});
export const insurancePolicySchema = z
  .object({
    cityId: z.string().regex(/^\d{6}$/),
    cityName: z.string().trim().min(2).max(16),
    enabled: z.boolean(),
    verifiedOn: date,
    reviewDueAt: date,
    base: z.object({
      ...windowFields,
      minCents: z.number().int().positive().max(100000000),
      maxCents: z.number().int().positive().max(100000000),
    }),
    pension: rate,
    medical: rate,
    account: rate,
    resident: z.object({
      ...windowFields,
      year: z.number().int().min(2026).max(2100),
      annualCents: z.number().int().positive().max(10000000),
      ageLabel: text,
    }),
    rules: z.object({
      ...windowFields,
      residentCandidates: z
        .array(z.enum(["local", "nonlocal", "permit"]))
        .max(3),
      benefitMedicalFunded: z.boolean(),
      receivingPensionAllowed: z.boolean(),
      flexMedicalOnly: z.enum(["confirm", "supported"]),
      flexEligibility: text,
      residentEligibility: text,
      waiting: text,
      account: text,
      retirement: text,
    }),
    paths: z
      .array(
        z.object({
          id: z.enum(insuranceRouteIds),
          title: z.string().trim().min(2).max(30),
          subtitle: text,
          medical: text,
          pension: text,
          conditions: z.array(text).min(1).max(6),
          steps: z.array(text).min(1).max(6),
          sourceIds: z.array(z.string().min(1)).min(1).max(8),
        }),
      )
      .length(5),
    sources: z
      .array(
        z.object({
          id: z.string().regex(/^[a-z0-9-]+$/),
          title: text,
          url: z.string().url().startsWith("https://"),
          institution: text,
        }),
      )
      .min(1)
      .max(20),
  })
  .superRefine((p, ctx) => {
    const issue = (message: string, path: (string | number)[] = []) =>
      ctx.addIssue({ code: "custom", message, path });
    if (p.base.maxCents < p.base.minCents) issue("上限不能低于下限", ["base"]);
    if (
      p.verifiedOn > new Date().toISOString().slice(0, 10) ||
      p.reviewDueAt < p.verifiedOn
    )
      issue("核查日期不能在未来，复核日期不能早于核查日期");
    if (new Set(p.paths.map((v) => v.id)).size !== 5)
      issue("五条参保路径必须各有一条");
    const ids = new Set(p.sources.map((v) => v.id));
    if (ids.size !== p.sources.length) issue("来源标识不能重复");
    for (const key of [
      "base",
      "pension",
      "medical",
      "account",
      "resident",
      "rules",
    ] as const) {
      const v = p[key];
      if (v.to && v.from > v.to) issue("截止日期早于生效日期", [key, "to"]);
      if (!ids.has(v.sourceId))
        issue("请选择存在的官方来源", [key, "sourceId"]);
    }
    if (p.pension.bps <= 0 || p.medical.bps <= 0)
      issue("养老与医保费率须大于0，请核查后填写");
    if (p.account.bps > p.medical.bps) issue("个人账户比例不能高于医保费率");
    if (
      p.resident.from > `${p.resident.year}-12-31` ||
      (p.resident.to && p.resident.to < `${p.resident.year}-01-01`)
    )
      issue("居民医保年份与有效期不符");
    p.paths.forEach((v, i) => {
      if (v.sourceIds.some((id) => !ids.has(id)))
        issue("路径引用了不存在的来源", ["paths", i]);
    });
  });
export type InsurancePolicy = z.infer<typeof insurancePolicySchema>;
export type InsuranceRouteId = (typeof insuranceRouteIds)[number];
export type InsuranceRecord = {
  draft: InsurancePolicy;
  published: InsurancePolicy | null;
};
export const insuranceSaveSchema = z.object({
  policy: insurancePolicySchema,
  publish: z.boolean(),
});
