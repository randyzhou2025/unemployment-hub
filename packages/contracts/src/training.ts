import { z } from "zod";
export const trainingGrades = [
  "l5",
  "l4",
  "l3",
  "l2",
  "l1",
  "noLevel",
] as const;
export const trainingGradeLabels: Record<
  (typeof trainingGrades)[number],
  string
> = {
  l5: "五级 / 初级工",
  l4: "四级 / 中级工",
  l3: "三级 / 高级工",
  l2: "二级 / 技师",
  l1: "一级 / 高级技师",
  noLevel: "不分等级",
};
export const trainingCategories = [
  { id: "digital-ai", label: "数字与 AI" },
  { id: "media-ecommerce", label: "新媒体电商" },
  { id: "care-service", label: "养老与家政" },
  { id: "fire-emergency", label: "消防与安全" },
] as const;
export const registrationLabels = {
  personal: "接受个人申报",
  organization: "所列机构团体申报",
  confirm: "先预约核验",
};
const short = z.string().trim().min(1).max(80);
const text = z.string().trim().min(2).max(800);
const id = z
  .string()
  .regex(/^[a-z0-9-]+$/)
  .max(60);
const sourceIds = z.array(id).min(1).max(12);
const date = z.string().date();
const cents = z.number().int().min(0).max(10000000);
const row = z.object({
  l5: cents,
  l4: cents,
  l3: cents,
  l2: cents,
  l1: cents,
  noLevel: cents,
});
export const trainingProjectSchema = z.object({
  id,
  title: short,
  fullName: short,
  enabled: z.boolean(),
  category: z.enum([
    "digital-ai",
    "media-ecommerce",
    "care-service",
    "fire-emergency",
  ]),
  subsidyClass: z.enum(["A", "B", "C"]),
  summary: text,
  referenceLevel: z.enum(trainingGrades),
  levels: z
    .array(
      z.object({
        key: z.enum(trainingGrades),
        registrationMode: z.enum(["personal", "organization", "confirm"]),
        registrationNote: text,
        feeCents: cents.nullable(),
        feeNote: text,
      }),
    )
    .min(1)
    .max(6),
  requirements: text,
  steps: z.array(text).min(1).max(6),
  registrationSourceId: id,
  sourceIds,
  noticeDate: date,
  noticeNote: text,
});
export const trainingCatalogSchema = z
  .object({
    cityId: z.literal("310000"),
    cityName: z.literal("上海"),
    enabled: z.boolean(),
    year: z.number().int().min(2026).max(2100),
    effectiveFrom: date,
    effectiveTo: date,
    verifiedOn: date,
    reviewDueAt: date,
    rates: z.object({ A: row, B: row, C: row }),
    contexts: z
      .array(
        z.object({
          id,
          label: short,
          ratioBps: z.number().int().min(0).max(15000).nullable(),
          note: text,
        }),
      )
      .min(1)
      .max(8),
    policyItems: z
      .array(z.object({ title: short, text, sourceIds }))
      .min(1)
      .max(15),
    applicationSteps: z.array(text).min(1).max(8),
    policySourceIds: sourceIds,
    sources: z
      .array(
        z.object({
          id,
          title: short,
          url: z.string().url().startsWith("https://"),
        }),
      )
      .min(1)
      .max(40),
    projects: z.array(trainingProjectSchema).max(40),
  })
  .superRefine((v, ctx) => {
    const issue = (message: string, path: (string | number)[] = []) =>
      ctx.addIssue({ code: "custom", message, path });
    if (v.effectiveFrom > v.effectiveTo) issue("有效期起止顺序错误");
    if (
      v.verifiedOn > new Date().toISOString().slice(0, 10) ||
      v.reviewDueAt < v.verifiedOn
    )
      issue("核查日期不能在未来，复核日期不能早于核查日期");
    const ids = new Set(v.sources.map((s) => s.id));
    if (ids.size !== v.sources.length) issue("来源标识不能重复");
    const refs = (refs: string[], path: (string | number)[]) => {
      if (refs.some((r) => !ids.has(r))) issue("引用的来源不存在", path);
    };
    refs(v.policySourceIds, ["policySourceIds"]);
    v.policyItems.forEach((item, i) =>
      refs(item.sourceIds, ["policyItems", i, "sourceIds"]),
    );
    if (new Set(v.contexts.map((c) => c.id)).size !== v.contexts.length)
      issue("身份对照标识不能重复");
    if (new Set(v.projects.map((p) => p.id)).size !== v.projects.length)
      issue("项目标识不能重复");
    v.projects.forEach((p, i) => {
      if (new Set(p.levels.map((l) => l.key)).size !== p.levels.length)
        issue("项目等级不能重复", ["projects", i, "levels"]);
      if (!p.levels.some((l) => l.key === p.referenceLevel))
        issue("列表参考等级须是项目已维护的等级", [
          "projects",
          i,
          "referenceLevel",
        ]);
      if (p.noticeDate > new Date().toISOString().slice(0, 10))
        issue("资料整理日期不能在未来", ["projects", i, "noticeDate"]);
      refs(
        [...p.sourceIds, p.registrationSourceId],
        ["projects", i, "sourceIds"],
      );
    });
  });
export type TrainingCatalog = z.infer<typeof trainingCatalogSchema>;
export type TrainingProject = z.infer<typeof trainingProjectSchema>;
export type TrainingGrade = (typeof trainingGrades)[number];
export type TrainingRecord = {
  draft: TrainingCatalog;
  published: TrainingCatalog | null;
  version: number;
};
export const trainingSaveSchema = z.object({
  catalog: trainingCatalogSchema,
  publish: z.boolean(),
  baseVersion: z.number().int().min(0),
});
