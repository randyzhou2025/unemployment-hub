export interface BudgetInput {
  savingsCents: number;
  monthlyIncomeCents: number;
  housingCents: number;
  livingCents: number;
  insuranceCents: number;
  otherCents: number;
  reserveCents: number;
}
export function parseMoney(input: string): number | null {
  const trimmed = input.trim();
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(trimmed)) return null;
  const [whole, fraction = ""] = trimmed.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(cents) ? cents : null;
}
export function calculateBudget(input: BudgetInput) {
  const values = Object.values(input);
  if (values.some((v) => !Number.isSafeInteger(v) || v < 0 || v > 99999999999))
    throw new Error("金额需要为有效的非负整数分");
  const expensesCents =
    input.housingCents +
    input.livingCents +
    input.insuranceCents +
    input.otherCents;
  const shortfallCents = Math.max(0, expensesCents - input.monthlyIncomeCents);
  const availableCents = Math.max(0, input.savingsCents - input.reserveCents);
  return {
    expensesCents,
    shortfallCents,
    availableCents,
    months:
      shortfallCents === 0
        ? null
        : Math.floor((availableCents * 10) / shortfallCents) / 10,
    reserveExceedsSavings: input.reserveCents > input.savingsCents,
  };
}
export function formatMoney(cents: number) {
  return (cents / 100).toLocaleString("zh-CN", { maximumFractionDigits: 2 });
}
export function calculateBenefitAmount(input: {
  approvedMonths: number;
  receivedMonths: number;
  firstYearMonthlyCents: number;
  secondYearMonthlyCents: number;
}) {
  const {
    approvedMonths,
    receivedMonths,
    firstYearMonthlyCents,
    secondYearMonthlyCents,
  } = input;
  if (
    !Number.isInteger(approvedMonths) ||
    approvedMonths < 1 ||
    approvedMonths > 24 ||
    !Number.isInteger(receivedMonths) ||
    receivedMonths < 0 ||
    receivedMonths > approvedMonths
  )
    throw new Error("核定期限需为1–24个月，已领取月数不能超过核定期限");
  if (
    [firstYearMonthlyCents, secondYearMonthlyCents].some(
      (v) => !Number.isSafeInteger(v) || v <= 0 || v > 10000000,
    )
  )
    throw new Error("需要有效的政策金额标准");
  const firstPeriodMonths = Math.max(
    0,
    Math.min(approvedMonths, 12) - receivedMonths,
  );
  const remainingMonths = approvedMonths - receivedMonths;
  const secondPeriodMonths = remainingMonths - firstPeriodMonths;
  const firstPeriodCents = firstPeriodMonths * firstYearMonthlyCents;
  const secondPeriodCents = secondPeriodMonths * secondYearMonthlyCents;
  return {
    remainingMonths,
    firstPeriodMonths,
    secondPeriodMonths,
    firstPeriodCents,
    secondPeriodCents,
    totalCents: firstPeriodCents + secondPeriodCents,
  };
}

export * from "./insurance";
export * from "./training";
