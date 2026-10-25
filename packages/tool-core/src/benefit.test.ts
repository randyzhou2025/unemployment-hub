import { it, expect } from "vitest";
import { calculateBenefitAmount } from "./index";
const amount = (approvedMonths: number, receivedMonths = 0) =>
  calculateBenefitAmount({
    approvedMonths,
    receivedMonths,
    firstYearMonthlyCents: 234000,
    secondYearMonthlyCents: 187200,
  });
it("第12、13、24个月的分段金额不会全部套用第一档", () => {
  expect(amount(12).totalCents).toBe(2808000);
  expect(amount(13).totalCents).toBe(2995200);
  expect(amount(24).totalCents).toBe(5054400);
});
it("已领取月份扣除后仍按原核定序号分档，不从第一档重新起算", () => {
  expect(amount(24, 11)).toMatchObject({
    remainingMonths: 13,
    firstPeriodMonths: 1,
    secondPeriodMonths: 12,
    totalCents: 2480400,
  });
  expect(amount(24, 12)).toMatchObject({
    firstPeriodMonths: 0,
    secondPeriodMonths: 12,
    totalCents: 2246400,
  });
  expect(amount(24, 24)).toMatchObject({ remainingMonths: 0, totalCents: 0 });
});
it("不能用小数月、超出核定期的月份或失效金额计算", () => {
  for (const [total, received] of [
    [0, 0],
    [25, 0],
    [1.5, 0],
    [12, -1],
    [12, 13],
    [12, NaN],
  ])
    expect(() => amount(total, received)).toThrow();
  expect(() =>
    calculateBenefitAmount({
      approvedMonths: 12,
      receivedMonths: 0,
      firstYearMonthlyCents: NaN,
      secondYearMonthlyCents: 100,
    }),
  ).toThrow();
});
