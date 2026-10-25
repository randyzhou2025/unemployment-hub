import { describe, expect, it } from "vitest";
import { defaultInsurancePolicy as p } from "../../../apps/api/src/db/insurance-policy";
import { insurancePolicySchema } from "@uh/contracts";
import {
  emptyInsuranceAnswers,
  recommendInsurance,
  insuranceQuote,
  insuranceAccount,
} from "./insurance";
const today = "2026-10-23";
const answers = (patch: Partial<typeof emptyInsuranceAnswers> = {}) => ({
  ...emptyInsuranceAnswers,
  ...patch,
});
const result = (patch: Partial<typeof emptyInsuranceAnswers> = {}) =>
  recommendInsurance(p, answers(patch), today);
describe("社保医保：费用与条件边界", () => {
  it("最低基数分项及合计精确到分", () => {
    expect(
      insuranceQuote(p, "benefit-medical", undefined, today)?.totalCents,
    ).toBe(0);
    expect(
      insuranceQuote(p, "benefit-pension", undefined, today)?.totalCents,
    ).toBe(150920);
    expect(insuranceQuote(p, "flexible", undefined, today)).toEqual({
      pensionCents: 150920,
      medicalCents: 75460,
      totalCents: 226380,
      unit: "月",
    });
    expect(insuranceQuote(p, "resident", undefined, today)).toEqual({
      pensionCents: null,
      medicalCents: 104000,
      totalCents: 104000,
      unit: "年",
    });
  });
  it("自选基数独立计算，非法或超界基数不报价", () => {
    expect(insuranceQuote(p, "benefit-medical", NaN, today)?.totalCents).toBe(
      0,
    );
    expect(insuranceQuote(p, "resident", NaN, today)?.totalCents).toBe(104000);
    expect(insuranceQuote(p, "flexible", 1000000, today)?.totalCents).toBe(
      300000,
    );
    for (const value of [NaN, 0, 754599, 3773101, 754600.2])
      expect(insuranceQuote(p, "flexible", value, today)).toBeNull();
  });
  it("账户理论计入和其他筹资合计等于医保费用", () => {
    expect(insuranceAccount(p, undefined, today)).toEqual({
      medical: 75460,
      personal: 15092,
      other: 60368,
      annualPersonal: 181104,
    });
  });
  it("新医保年度或费率到期不使用旧账户参数", () => {
    const q = structuredClone(p);
    q.reviewDueAt = "2030-01-01";
    expect(insuranceAccount(q, undefined, "2027-03-01")).toBeNull();
    expect(
      insuranceQuote(q, "benefit-pension", undefined, "2027-03-01")?.totalCents,
    ).toBe(150920);
    expect(insuranceQuote(q, "resident", undefined, "2027-01-01")).toBeNull();
  });
  it("复核到期及规则未生效，不作个人建议和报价", () => {
    expect(insuranceQuote(p, "flexible", undefined, "2026-11-23")).toBeNull();
    expect(
      recommendInsurance(
        p,
        answers({ status: "receiving", benefitPlace: "local" }),
        "2026-11-23",
      ).routes,
    ).toEqual([]);
    expect(insuranceQuote(p, "flexible", undefined, "2025-12-31")).toBeNull();
  });
  it("本地在领可比较续缴与暂停养老，不替用户决定预算", () => {
    expect(
      result({ status: "receiving", benefitPlace: "local" }).routes,
    ).toEqual(["benefit-medical", "benefit-pension"]);
    expect(
      result({ status: "receiving", benefitPlace: "local", pension: "pause" })
        .routes,
    ).toEqual(["benefit-medical"]);
    expect(
      result({
        status: "receiving",
        benefitPlace: "local",
        pension: "continue",
      }).routes,
    ).toEqual(["benefit-pension"]);
  });
  it("跨城市或未知待遇地不能给零自付个人建议", () => {
    for (const benefitPlace of ["other", "unknown"] as const)
      expect(result({ status: "receiving", benefitPlace }).routes).toEqual([]);
    expect(
      result({ cityId: "110000", status: "receiving", benefitPlace: "local" })
        .routes,
    ).toEqual([]);
  });
  it("审核中不等于已在领，不能直接匹配基金代缴", () => {
    const r = result({ status: "pending", residence: "permit" });
    expect(r.routes).toEqual([]);
    expect(r.notes.join("")).toContain("不等于");
  });
  it("实际灵活就业仍需核实资格，医保单缴不作无依据承诺", () => {
    const r = result({ status: "flexible", pension: "pause" });
    expect(r.routes).toEqual(["flexible"]);
    expect(r.notes.join("")).toContain("尚未确认");
    expect(r.notes.join("")).toContain("只想缴");
  });
  it("居住证和外地户籍不会自动匹配居民医保", () => {
    for (const residence of ["permit", "nonlocal", "unknown"] as const)
      expect(result({ status: "unemployed", residence }).routes).toEqual([]);
    expect(
      result({
        status: "unemployed",
        residence: "local",
        medical: "interrupted",
      }).routes,
    ).toEqual(["resident"]);
    expect(
      result({ status: "unemployed", residence: "local", medical: "employee" })
        .routes,
    ).toEqual([]);
  });
  it("医保断缴或未知保留等待期与待遇核查提示", () => {
    expect(
      result({ status: "flexible", medical: "interrupted" }).notes.join(""),
    ).toContain("待遇起始日");
    expect(
      result({ status: "flexible", medical: "interrupted" }).notes.join(""),
    ).toContain("6个月");
  });
  it("特殊居民资格与其他城市候选范围单独判断", () => {
    expect(
      result({
        status: "unemployed",
        residence: "nonlocal",
        eligibility: "confirmed",
      }).routes,
    ).toEqual(["resident"]);
    const q = structuredClone(p);
    q.cityId = "990003";
    q.rules.residentCandidates = ["permit"];
    expect(
      recommendInsurance(
        q,
        answers({
          cityId: "990003",
          status: "unemployed",
          residence: "permit",
        }),
        today,
      ).routes,
    ).toEqual(["resident"]);
    expect(
      recommendInsurance(
        q,
        answers({ cityId: "990003", status: "unemployed", residence: "local" }),
        today,
      ).routes,
    ).toEqual([]);
  });
  it("重新就业优先单位，不用个人廉价参保替代", () =>
    expect(result({ status: "employed", pension: "pause" }).routes).toEqual([
      "employed",
    ]));
  it("临近退休专项补贴不自动抵扣费用", () => {
    const r = result({
      status: "receiving",
      benefitPlace: "local",
      retirement: "yes",
    });
    expect(r.notes.join("")).toContain("先缴后补");
    expect(
      insuranceQuote(p, "benefit-pension", undefined, today)?.totalCents,
    ).toBe(150920);
  });
  it("城市规则关闭时不沿用上海基金代缴与个人续缴结论", () => {
    const q = structuredClone(p);
    q.rules.benefitMedicalFunded = false;
    expect(insuranceQuote(q, "benefit-medical", undefined, today)).toBeNull();
    expect(
      recommendInsurance(
        q,
        answers({ status: "receiving", benefitPlace: "local" }),
        today,
      ).routes,
    ).toEqual([]);
  });
  it("未填写的零费率不能发布成免费个人参保方案", () => {
    const q = structuredClone(p);
    q.medical.bps = 0;
    q.account.bps = 0;
    expect(insurancePolicySchema.safeParse(q).success).toBe(false);
  });
  it("发布数据拒绝重复路径、悬空来源和反向日期", () => {
    for (const mutate of [
      (q: typeof p) => (q.paths[1].id = q.paths[0].id),
      (q: typeof p) => (q.pension.sourceId = "missing"),
      (q: typeof p) => (q.medical.to = "2020-01-01"),
      (q: typeof p) => (q.base.maxCents = 1),
    ]) {
      const q = structuredClone(p);
      mutate(q);
      expect(insurancePolicySchema.safeParse(q).success).toBe(false);
    }
  });
});
