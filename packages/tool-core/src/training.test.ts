import { describe, it, expect } from "vitest";
import { trainingCatalogSchema } from "@uh/contracts";
import { trainingReference, filterTraining } from "./training";
import data from "../../../apps/api/src/db/data/training-shanghai.json";
const catalog = trainingCatalogSchema.parse(data);
const ai = catalog.projects.find((p) => p.id === "ai-trainer")!;
const today = "2026-10-23";
describe("培训补贴标准对照", () => {
  it("只按市级基准及比例计算，不叠加工会、区级资助", () => {
    expect(trainingReference(catalog, ai, "l3", "standard", today)).toBe(
      325000,
    );
    expect(trainingReference(catalog, ai, "l3", "employed", today)).toBe(
      260000,
    );
    expect(trainingReference(catalog, ai, "l3", "eligible-full", today)).toBe(
      325000,
    );
    expect(trainingReference(catalog, ai, "l3", "reemployed", today)).toBe(
      390000,
    );
  });
  it("不确定身份、未维护等级和未知选项不输出金额", () => {
    expect(trainingReference(catalog, ai, "l3", "unknown", today)).toBeNull();
    expect(trainingReference(catalog, ai, "l5", "standard", today)).toBeNull();
    expect(trainingReference(catalog, ai, "l3", "invalid", today)).toBeNull();
  });
  it("不分等级操作证按C类标准，不能套用电工等级证", () => {
    const p = catalog.projects.find((p) => p.id === "special-operation")!;
    expect(trainingReference(catalog, p, "noLevel", "standard", today)).toBe(
      50000,
    );
    expect(trainingReference(catalog, p, "l4", "standard", today)).toBeNull();
  });
  it("过期、待复核、未生效或隐藏均不输出精确金额", () => {
    for (const change of [
      { effectiveTo: "2026-10-22" },
      { reviewDueAt: "2026-10-22" },
      { effectiveFrom: "2026-10-24" },
      { enabled: false },
    ])
      expect(
        trainingReference(
          { ...catalog, ...change },
          ai,
          "l3",
          "standard",
          today,
        ),
      ).toBeNull();
    expect(
      trainingReference(
        catalog,
        { ...ai, enabled: false },
        "l3",
        "standard",
        today,
      ),
    ).toBeNull();
  });
  it("关键词、方向和个人申报可组合，不把团体项目混入", () => {
    expect(
      filterTraining(catalog.projects, "人工 智能", "digital-ai", true).map(
        (p) => p.id,
      ),
    ).toEqual(["ai-trainer"]);
    expect(
      filterTraining(catalog.projects, "", "care-service", true).map(
        (p) => p.id,
      ),
    ).toEqual(["domestic-worker"]);
    expect(
      filterTraining(catalog.projects, "人工智能", "care-service", true),
    ).toHaveLength(0);
  });
});
describe("后台培训数据完整性", () => {
  it("拒绝断开的来源引用与无效参考等级", () => {
    const broken = structuredClone(catalog);
    broken.projects[0].sourceIds = ["missing"];
    expect(trainingCatalogSchema.safeParse(broken).success).toBe(false);
    const invalid = structuredClone(catalog);
    invalid.projects[0].referenceLevel = "l1";
    expect(trainingCatalogSchema.safeParse(invalid).success).toBe(false);
  });
  it("拒绝重复等级、重复项目和未来资料日期", () => {
    const broken = structuredClone(catalog);
    broken.projects[0].levels.push(broken.projects[0].levels[0]);
    expect(trainingCatalogSchema.safeParse(broken).success).toBe(false);
    const dup = structuredClone(catalog);
    dup.projects.push(dup.projects[0]);
    expect(trainingCatalogSchema.safeParse(dup).success).toBe(false);
    const future = structuredClone(catalog);
    future.projects[0].noticeDate = "2099-01-01";
    expect(trainingCatalogSchema.safeParse(future).success).toBe(false);
  });
});
