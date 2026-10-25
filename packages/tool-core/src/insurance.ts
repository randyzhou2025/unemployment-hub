import type { InsurancePolicy, InsuranceRouteId } from "@uh/contracts";
export type InsuranceAnswers = {
  cityId: string;
  status:
    | "receiving"
    | "pending"
    | "unemployed"
    | "exhausted"
    | "flexible"
    | "employed"
    | "unknown";
  benefitPlace: "local" | "other" | "unknown";
  residence: "local" | "nonlocal" | "permit" | "unknown";
  medical: "employee" | "resident" | "interrupted" | "unknown";
  pension: "continue" | "pause" | "compare";
  eligibility: "confirmed" | "unknown";
  retirement: "yes" | "no" | "unknown";
};
export const emptyInsuranceAnswers: InsuranceAnswers = {
  cityId: "310000",
  status: "unknown",
  benefitPlace: "unknown",
  residence: "unknown",
  medical: "unknown",
  pension: "compare",
  eligibility: "unknown",
  retirement: "unknown",
};
export function insuranceWindowCurrent(
  v: { from: string; to: string | null },
  today: string,
) {
  return v.from <= today && (!v.to || today <= v.to);
}
export function insuranceQuote(
  p: InsurancePolicy,
  route: InsuranceRouteId,
  baseCents = p.base.minCents,
  today = new Date().toISOString().slice(0, 10),
) {
  const current = (
    key: "base" | "pension" | "medical" | "account" | "resident" | "rules",
  ) => insuranceWindowCurrent(p[key], today);
  if (!p.enabled || p.reviewDueAt < today || !current("rules")) return null;
  if (route === "employed") return null;
  if (route === "resident")
    return current("resident") && today.slice(0, 4) === String(p.resident.year)
      ? {
          pensionCents: null,
          medicalCents: p.resident.annualCents,
          totalCents: p.resident.annualCents,
          unit: "年" as const,
        }
      : null;
  if (route.startsWith("benefit") && !p.rules.benefitMedicalFunded) return null;
  if (route === "benefit-medical")
    return {
      pensionCents: 0,
      medicalCents: 0,
      totalCents: 0,
      unit: "月" as const,
    };
  if (
    !Number.isSafeInteger(baseCents) ||
    baseCents < p.base.minCents ||
    baseCents > p.base.maxCents ||
    !current("base")
  )
    return null;
  if (route === "benefit-pension" && !p.rules.receivingPensionAllowed)
    return null;
  if (!current("pension")) return null;
  if (route === "flexible" && !current("medical")) return null;
  const pensionCents = Math.round((baseCents * p.pension.bps) / 10000);
  const medicalCents =
    route === "flexible" ? Math.round((baseCents * p.medical.bps) / 10000) : 0;
  return {
    pensionCents,
    medicalCents,
    totalCents: pensionCents + medicalCents,
    unit: "月" as const,
  };
}
export function insuranceAccount(
  p: InsurancePolicy,
  baseCents = p.base.minCents,
  today = new Date().toISOString().slice(0, 10),
) {
  if (
    !insuranceQuote(p, "flexible", baseCents, today) ||
    !insuranceWindowCurrent(p.account, today)
  )
    return null;
  const medical = Math.round((baseCents * p.medical.bps) / 10000),
    personal = Math.round((baseCents * p.account.bps) / 10000);
  return {
    medical,
    personal,
    other: medical - personal,
    annualPersonal: personal * 12,
  };
}
export function recommendInsurance(
  p: InsurancePolicy,
  a: InsuranceAnswers,
  today = new Date().toISOString().slice(0, 10),
) {
  const notes: string[] = [];
  let routes: InsuranceRouteId[] = [];
  let heading = "先核实，再安排参保";
  if (a.cityId !== p.cityId)
    return {
      routes,
      heading: "请先选择实际参保城市",
      notes: ["不同城市的资格、费用和待遇衔接规则不能混用。"],
    };
  if (
    !p.enabled ||
    p.reviewDueAt < today ||
    !insuranceWindowCurrent(p.rules, today)
  )
    return {
      routes,
      heading: "暂无法提供费用建议",
      notes: ["请查看最新政策或咨询经办机构。"],
    };
  if (a.status === "employed") {
    routes = ["employed"];
    heading = "重新就业，先落实单位参保";
  } else if (
    a.status === "receiving" &&
    a.benefitPlace === "local" &&
    p.rules.benefitMedicalFunded
  ) {
    routes =
      a.pension === "pause"
        ? ["benefit-medical"]
        : a.pension === "continue" && p.rules.receivingPensionAllowed
          ? ["benefit-pension"]
          : [
              "benefit-medical",
              ...(p.rules.receivingPensionAllowed
                ? ["benefit-pension" as const]
                : []),
            ];
    heading =
      a.pension === "compare"
        ? "医保先确认，养老按预算选择"
        : "领金期间，分开安排医保与养老";
    notes.push(
      "按你填写的本地在领状态匹配；先查询基金代缴记录与医保待遇，避免重复缴费。",
    );
    if (a.retirement !== "no") notes.push(p.rules.retirement);
  } else if (a.status === "receiving") {
    notes.push(
      "请先核实失业金待遇地及医保代缴地，不能直接套用当前城市的零自付方案。",
    );
  } else if (a.status === "flexible") {
    routes = ["flexible"];
    heading = "有实际灵活就业，先核对参保条件";
    notes.push(p.rules.flexEligibility);
    if (a.eligibility !== "confirmed")
      notes.push("你尚未确认当地参保资格，以下仅为条件成立时的费用参考。");
    if (a.pension === "pause")
      notes.push(
        p.rules.flexMedicalOnly === "supported"
          ? "当地支持单独参保医保，具体资格与登记流程仍须确认；费用页展示两项分别费用。"
          : "如果只想缴职工医保，请向当地经办机构确认能否单独参保。",
      );
  } else if (a.status !== "unknown") {
    heading = "先确认医保衔接，再选缴费路径";
    if (a.status === "pending")
      notes.push(
        "失业金尚在申请或审核中，不等于医保已经由基金代缴，请先查当前待遇。",
      );
    notes.push(p.rules.residentEligibility);
    if (
      (a.eligibility === "confirmed" ||
        p.rules.residentCandidates.some((kind) => kind === a.residence)) &&
      a.medical !== "employee"
    )
      routes = ["resident"];
    else
      notes.push(
        "暂无足够信息确认居民医保资格。若有实际灵活就业，可返回修改状态；不要仅凭户籍或居住证推断可以参保。",
      );
    if (a.pension !== "pause")
      notes.push(
        "居民医保年费不包含养老。若希望续缴职工养老，请先核实当地个人参保条件与登记方式；有实际灵活就业时，可返回选择相应路径。",
      );
    if (a.medical === "employee")
      notes.push(
        "你填写了职工医保待遇正常，先查询单位停保月份和待遇截止日，再安排后续参保，避免重复登记。",
      );
  } else notes.push("先补充当前就业和领金情况，才能缩小方案范围。");
  if (a.medical === "interrupted" || a.medical === "unknown")
    notes.push(
      "当前医保待遇尚未确认。请优先查询停保时间、待遇起始日和等待期，不能仅凭缴费成功判断可报销。",
    );
  if (routes.includes("flexible") || routes.includes("resident"))
    notes.push(p.rules.waiting);
  if (a.pension === "pause")
    notes.push(
      "养老已有缴费年限不会清零，暂停月份不新增年限；不能任意补缴来增加年限。",
    );
  return { routes, heading, notes };
}
