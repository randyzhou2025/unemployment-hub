import { describe, it, expect } from "vitest";
import { parseMoney, calculateBudget } from "./index";
const base = {
  savingsCents: 3000000,
  monthlyIncomeCents: 100000,
  housingCents: 200000,
  livingCents: 100000,
  insuranceCents: 0,
  otherCents: 0,
  reserveCents: 600000,
};
describe("预算资金规划", () => {
  it("以整数分精确解析金额", () => {
    expect(parseMoney("0.29")).toBe(29);
    expect(parseMoney("1234.5")).toBe(123450);
  });
  it.each(["", "-1", "1.001", "abc", "1e3", "Infinity", "9999999999"])(
    "拒绝无效金额 %s",
    (v) => expect(parseMoney(v)).toBeNull(),
  );
  it("只消耗扣除备用金后的资金", () =>
    expect(calculateBudget(base)).toMatchObject({
      availableCents: 2400000,
      shortfallCents: 200000,
      months: 12,
    }));
  it("收支平衡不伪造无限期限", () =>
    expect(
      calculateBudget({ ...base, monthlyIncomeCents: 300000 }).months,
    ).toBeNull());
  it("备用金超余额时显示零可用并保留提示", () =>
    expect(calculateBudget({ ...base, reserveCents: 4000000 })).toMatchObject({
      months: 0,
      reserveExceedsSavings: true,
    }));
  it("不足整月时向下保留一位小数", () =>
    expect(
      calculateBudget({ ...base, savingsCents: 99000, reserveCents: 0 }).months,
    ).toBe(0.4));
  it("拒绝负值和浮点分", () => {
    expect(() => calculateBudget({ ...base, savingsCents: -1 })).toThrow();
    expect(() => calculateBudget({ ...base, savingsCents: 0.1 })).toThrow();
  });
});
