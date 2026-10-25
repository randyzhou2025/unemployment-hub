import { benefitPolicySchema } from "@uh/contracts";

// 已人工核对的初始版本；重新部署不会将核查日期自动刷新。
export const defaultBenefitPolicy = benefitPolicySchema.parse({
  region: "310000",
  title: "上海失业保险金",
  firstYearMonthlyCents: 234000,
  secondYearMonthlyCents: 187200,
  extensionMonthlyCents: 169000,
  maxMonths: 24,
  effectiveFrom: "2026-07-01",
  effectiveTo: "2028-06-30",
  rulesEffectiveFrom: "2026-08-16",
  rulesEffectiveTo: "2031-08-15",
  verifiedOn: "2026-10-22",
  reviewDueAt: "2026-11-21",
  items: [
    {
      title: "先核对申领条件",
      text: "最后参保地或户籍地在上海，累计缴费满1年、非本人意愿中断就业，且已在上海失业登记并有求职要求，须同时满足。",
    },
    {
      title: "期限如何核定",
      text: "扣除已用于核定待遇的缴费年限后，满1年对应2个月，此后每满1年增加2个月，一次最长24个月。特殊群体另有规定。",
    },
    {
      title: "审核与发放",
      text: "受理后5个工作日内审核，符合条件的从受理次月按月发放。",
    },
    {
      title: "新申请无需每3个月重领",
      text: "2026年8月16日起，审核通过后持续发放至核定期限届满或发生法定停发情形。",
    },
    {
      title: "原领取人员有衔接安排",
      text: "2026年8月15日及以前已在领取的，原周期继续发放；周期结束后如有剩余月数并希望继续领取，仍需再申请一次。",
    },
    {
      title: "延长领取有条件",
      text: "期满仍未就业、距法定退休年龄不足1年，可按规定自动延长至退休年龄。仅可享受一次；此前已申请延长的按衔接规定执行。",
    },
    {
      title: "医保与重新就业",
      text: "领金期间职工医保费按规定由基金承担。重新就业等法定情形须停止领取，并主动办理停领手续。",
    },
    {
      title: "线上或线下办理",
      text: "可通过随申办办理，也可携有效身份证明及实名银行卡等材料到公共就业服务机构办理。实际期限和资格以官方核定为准。",
    },
  ],
  sources: [
    {
      id: "sh-benefit-standard-2026",
      title: "失业保险金支付标准 · 沪人社规〔2026〕7号",
      institution: "上海市人力资源和社会保障局",
      url: "https://rsj.sh.gov.cn/tshbx_17729/20260702/t0035_1442080.html",
      publishedAt: "2026-06-30",
      verifiedAt: "2026-10-22T01:04:57.977Z",
    },
    {
      id: "sh-benefit-rules-2026",
      title: "失业保险金申领发放实施办法 · 沪人社规〔2026〕18号",
      institution: "上海市人力资源和社会保障局",
      url: "https://rsj.sh.gov.cn/tshbx_17729/20260812/t0035_1443067.html",
      publishedAt: "2026-08-06",
      verifiedAt: "2026-10-22T01:04:57.977Z",
    },
    {
      id: "sh-benefit-qa-2026",
      title: "申领发放实施办法 · 官方政策问答",
      institution: "上海市人力资源和社会保障局",
      url: "https://rsj.sh.gov.cn/tzcjd_17352_17352/20260812/t0035_1443066.html",
      publishedAt: "2026-08-06",
      verifiedAt: "2026-10-22T01:04:57.977Z",
    },
    {
      id: "sh-benefit-transition-2026",
      title: "原领取人员衔接 · 官方答疑",
      institution: "上海市人力资源和社会保障局",
      url: "https://rsj.sh.gov.cn/tlqtj_17563/20260817/t0035_1443150.html",
      publishedAt: "2026-08-17",
      verifiedAt: "2026-10-22T01:04:57.977Z",
    },
  ],
});
