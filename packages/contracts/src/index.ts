import { z } from "zod";
export const stageSchema = z.enum([
  "preparing",
  "newly",
  "between",
  "seeking",
  "rejoining",
]);
const httpsUrl = z
  .string()
  .url()
  .refine((v) => v.startsWith("https://"), "来源必须使用 HTTPS");
export const sourceSchema = z.object({
  id: z.string().min(1).max(80),
  title: z.string().min(2).max(240),
  institution: z.string().min(2).max(100),
  url: httpsUrl,
  publishedAt: z.string().nullable(),
  verifiedAt: z
    .string()
    .datetime()
    .nullable()
    .refine(
      (v) => v === null || Date.parse(v) <= Date.now() + 60000,
      "核查时间不能晚于当前时间",
    ),
});
export type Source = z.infer<typeof sourceSchema>;
export type ContentBlock =
  | { type: "paragraph" | "heading" | "notice"; text: string }
  | { type: "list"; items: string[] };
export const taskSchema = z.object({
  key: z.string().min(1).max(100),
  title: z.string().min(2).max(140),
  note: z.string().max(500).default(""),
});
export const draftSchema = z
  .object({
    kind: z.enum(["article", "guide", "resource"]),
    title: z.string().min(4).max(120),
    summary: z.string().min(8).max(300),
    stageKeys: z.array(stageSchema).min(1),
    issueKeys: z
      .array(
        z.enum([
          "rights",
          "benefits",
          "insurance",
          "living",
          "jobs",
          "training",
          "safety",
        ]),
      )
      .min(1),
    scope: z.enum(["national", "specified_regions"]),
    regionIds: z.array(z.string().regex(/^\d{6}$/)),
    markdown: z
      .string()
      .min(20)
      .max(40000)
      .refine(
        (v) => !/<\/?[a-z][^>]*>/i.test(v),
        "不支持 HTML，请使用纯文本或 Markdown",
      ),
    keyPoints: z.array(z.string().min(2).max(300)).max(5),
    sourceRefs: z.array(sourceSchema).max(10),
    effectiveFrom: z.string().date().nullable(),
    effectiveTo: z.string().date().nullable(),
    reviewDueAt: z.string().date(),
    attribution: z.enum(["editorial", "policy_summary", "official_navigation"]),
    tasks: z.array(taskSchema).max(30).default([]),
    resourceUrl: httpsUrl.nullable().default(null),
  })
  .superRefine((v, ctx) => {
    if (v.scope === "specified_regions" && !v.regionIds.length)
      ctx.addIssue({
        code: "custom",
        path: ["regionIds"],
        message: "请选择适用地区",
      });
    if (v.scope === "national" && v.regionIds.length)
      ctx.addIssue({
        code: "custom",
        path: ["regionIds"],
        message: "全国通用不应附带地区限制",
      });
    if (v.effectiveFrom && v.effectiveTo && v.effectiveFrom > v.effectiveTo)
      ctx.addIssue({
        code: "custom",
        path: ["effectiveTo"],
        message: "截止日期早于生效日期",
      });
    if (v.attribution !== "editorial" && !v.sourceRefs.length)
      ctx.addIssue({
        code: "custom",
        path: ["sourceRefs"],
        message: "政策解读及官方导航必须附原始来源",
      });
    if (v.kind === "guide" && !v.tasks.length)
      ctx.addIssue({
        code: "custom",
        path: ["tasks"],
        message: "指南需要至少一项行动",
      });
    if (v.kind === "resource" && !v.resourceUrl)
      ctx.addIssue({
        code: "custom",
        path: ["resourceUrl"],
        message: "资源需要官方链接",
      });
  });
export type Draft = z.infer<typeof draftSchema>;
export type Content = Draft & {
  id: string;
  revision: number;
  status: "published" | "withdrawn";
  verificationState: "verified" | "needs_review";
  publishedAt: string;
  verifiedAt: string;
  body: ContentBlock[];
};
export type ContentSummary = Omit<
  Content,
  "markdown" | "body" | "tasks" | "sourceRefs" | "keyPoints"
>;
export type Envelope<T> = { data: T; meta: { requestId: string } };
export const querySchema = z.object({
  q: z.string().max(80).default(""),
  stage: stageSchema.optional(),
  region: z.string().regex(/^(national|\d{6})$/).default("national"),
  issue: z.string().max(40).optional(),
  kind: z.enum(["article", "guide", "resource"]).optional(),
  cursor: z.coerce.number().int().min(0).max(100000).default(0),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type PageResult = { items: ContentSummary[]; nextCursor: number | null };
export const feedbackSchema = z.object({
  contentId: z.string().max(100).optional(),
  message: z.string().trim().min(5).max(2000),
});

export const homeSectionSchema = z.object({
  id: z
    .string()
    .regex(/^[a-z][a-z0-9-]{0,39}$/, "板块标识需为小写字母、数字或短横线"),
  title: z.string().trim().min(2).max(8),
  subtitle: z.string().trim().min(2).max(16),
  icon: z.enum([
    "benefits",
    "budget",
    "insurance",
    "rights",
    "training",
    "jobs",
    "safety",
    "check",
    "link",
  ]),
  tone: z.enum(["blue", "green", "orange", "violet", "teal", "pink"]),
  destination: z.enum([
    "benefit-center",
    "benefits",
    "insurance",
    "rights",
    "training",
    "jobs",
    "safety",
    "living",
  ]),
  enabled: z.boolean(),
});
export const homeSectionsSchema = z
  .array(homeSectionSchema)
  .max(18)
  .superRefine((items, ctx) => {
    if (new Set(items.map((s) => s.id)).size !== items.length)
      ctx.addIssue({ code: "custom", message: "板块标识不能重复" });
  });
export type HomeSection = z.infer<typeof homeSectionSchema>;
export const benefitPolicySchema = z
  .object({
    region: z.literal("310000"),
    title: z.string().trim().min(4).max(40),
    firstYearMonthlyCents: z.number().int().positive().max(10000000),
    secondYearMonthlyCents: z.number().int().positive().max(10000000),
    extensionMonthlyCents: z.number().int().positive().max(10000000),
    maxMonths: z.literal(24),
    effectiveFrom: z.string().date(),
    effectiveTo: z.string().date(),
    rulesEffectiveFrom: z.string().date(),
    rulesEffectiveTo: z.string().date(),
    verifiedOn: z.string().date(),
    reviewDueAt: z.string().date(),
    items: z
      .array(
        z.object({
          title: z.string().trim().min(2).max(30),
          text: z.string().trim().min(8).max(300),
        }),
      )
      .min(1)
      .max(12),
    sources: z.array(sourceSchema).min(2).max(6),
  })
  .superRefine((v, ctx) => {
    if (
      v.effectiveFrom > v.effectiveTo ||
      v.rulesEffectiveFrom > v.rulesEffectiveTo
    )
      ctx.addIssue({
        code: "custom",
        path: ["effectiveTo"],
        message: "截止日期不能早于生效日期",
      });
    if (
      v.verifiedOn > new Date().toISOString().slice(0, 10) ||
      v.reviewDueAt < v.verifiedOn
    )
      ctx.addIssue({
        code: "custom",
        path: ["verifiedOn"],
        message: "核查日期不能在未来，复核日期不能早于核查日期",
      });
    if (new Set(v.sources.map((s) => s.id)).size !== v.sources.length)
      ctx.addIssue({
        code: "custom",
        path: ["sources"],
        message: "来源标识不能重复",
      });
  });
export type BenefitPolicy = z.infer<typeof benefitPolicySchema>;
export type BenefitPolicyState =
  | "current"
  | "needs_review"
  | "expired"
  | "upcoming";
export type BenefitPolicyResult = {
  policy: BenefitPolicy | null;
  state: BenefitPolicyState | null;
};
export function benefitPolicyState(
  policy: BenefitPolicy,
  today: string,
): BenefitPolicyState {
  if (policy.effectiveFrom > today || policy.rulesEffectiveFrom > today)
    return "upcoming";
  if (policy.effectiveTo < today || policy.rulesEffectiveTo < today)
    return "expired";
  return policy.reviewDueAt < today ? "needs_review" : "current";
}

export * from "./insurance";
export * from "./training";
export * from "./account";
