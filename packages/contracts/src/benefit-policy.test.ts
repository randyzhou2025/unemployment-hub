import { describe, it, expect } from "vitest";
import { benefitPolicySchema, benefitPolicyState } from "./index";
import { defaultBenefitPolicy } from "../../../apps/api/src/db/benefit-policy";
describe("政策有效期与来源", () => {
  it("执行日、截止日含当天；超过复核日、过期与未执行分别提示", () => {
    expect(benefitPolicyState(defaultBenefitPolicy, "2026-10-22")).toBe(
      "current",
    );
    expect(benefitPolicyState(defaultBenefitPolicy, "2026-11-21")).toBe(
      "current",
    );
    expect(benefitPolicyState(defaultBenefitPolicy, "2026-11-22")).toBe(
      "needs_review",
    );
    expect(
      benefitPolicyState(
        { ...defaultBenefitPolicy, reviewDueAt: "2028-06-30" },
        "2028-06-30",
      ),
    ).toBe("current");
    expect(benefitPolicyState(defaultBenefitPolicy, "2028-07-01")).toBe(
      "expired",
    );
    expect(benefitPolicyState(defaultBenefitPolicy, "2026-08-15")).toBe(
      "upcoming",
    );
  });
  it("政策必须有安全的原文来源且日期顺序合理", () => {
    expect(
      benefitPolicySchema.safeParse({ ...defaultBenefitPolicy, sources: [] })
        .success,
    ).toBe(false);
    expect(
      benefitPolicySchema.safeParse({
        ...defaultBenefitPolicy,
        effectiveTo: "2020-01-01",
      }).success,
    ).toBe(false);
    expect(
      benefitPolicySchema.safeParse({
        ...defaultBenefitPolicy,
        sources: defaultBenefitPolicy.sources.map((s) => ({
          ...s,
          url: "javascript:alert(1)",
        })),
      }).success,
    ).toBe(false);
  });
});
