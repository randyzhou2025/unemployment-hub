import { insurancePolicySchema, type InsuranceRecord } from "@uh/contracts";
// 核查版本固定；保存草稿、部署均不会自动延长核查日期。
export const defaultInsurancePolicy = insurancePolicySchema.parse({
  cityId: "310000",
  cityName: "上海",
  enabled: true,
  verifiedOn: "2026-10-23",
  reviewDueAt: "2026-11-22",
  base: {
    minCents: 754600,
    maxCents: 3773100,
    from: "2026-07-01",
    to: null,
    sourceId: "base",
  },
  pension: {
    bps: 2000,
    from: "2024-03-01",
    to: "2028-04-30",
    sourceId: "pension",
  },
  medical: {
    bps: 1000,
    from: "2026-03-01",
    to: "2027-02-28",
    sourceId: "medical",
  },
  account: {
    bps: 200,
    from: "2026-07-01",
    to: "2027-06-30",
    sourceId: "account",
  },
  resident: {
    year: 2026,
    annualCents: 104000,
    ageLabel: "超过18周岁、不满60周岁",
    from: "2026-01-01",
    to: "2026-12-31",
    sourceId: "resident-price",
  },
  rules: {
    from: "2026-01-01",
    to: "2028-04-30",
    sourceId: "flexible",
    residentCandidates: ["local"],
    benefitMedicalFunded: true,
    receivingPensionAllowed: true,
    flexMedicalOnly: "confirm",
    flexEligibility:
      "在上海实际从事自雇、非全日制等灵活就业，且符合当地参保条件，才可按灵活就业身份登记。仅处于失业状态不自动取得资格；年龄及具体身份由经办机构确认。",
    residentEligibility:
      "未参加其他基本医保且符合上海居民医保参保范围，方可申请。上海户籍成年居民属于规定范围；外地成年人的普通居住证不自动赋予资格，特殊身份需另行核实。",
    waiting:
      "上海灵活就业职工医保原则上有6个月待遇等待期；原正常享受职工或居民医保待遇，中断后3个月内按规定衔接的，可不受该等待期限制。居民医保非集中参保、断缴等也可能有等待期，办理前确认待遇起始日。",
    account:
      "在职职工个人账户按本人缴费基数的2%计入。按医保年度预计入、再依实际参保情况清算；月度对应金额是理解比例的折算，不是每月固定到账承诺。",
    retirement:
      "若领取失业金且距法定退休年龄不足1年，可向经办机构核实养老缴费支持：符合条件者先缴后补，不是所有领金人员都适用，也不能与有关补贴重复享受。下列费用不预扣补贴。",
  },
  paths: [
    {
      id: "benefit-medical",
      title: "领失业金，先保医保",
      subtitle: "养老暂缓，先稳住眼前保障",
      medical:
        "本市领金期间，职工医保（含生育保险）按规定由失业保险基金代缴，个人不缴医保费。",
      pension: "养老可暂时停缴。过去的缴费年限保留，暂停月份不新增年限。",
      conditions: [
        "已核定且正在上海领取失业保险金",
        "确认医保代缴记录与实际待遇状态",
      ],
      steps: [
        "在随申办核对失业金领取状态与医保参保记录",
        "核实代缴起始月和医保待遇，避免重复自行参保",
        "领金结束或重新就业时，及时安排医保衔接",
      ],
      sourceIds: ["benefit-medical", "benefit-pension"],
    },
    {
      id: "benefit-pension",
      title: "领金＋个人续缴养老",
      subtitle: "医保基金代缴，养老个人续上",
      medical: "符合上海领金条件时医保由基金代缴，不再重复按灵活就业缴医保。",
      pension:
        "按规定以个人身份续缴职工养老，与普通灵活就业养老属于同一制度；按所选基数的20%缴纳。",
      conditions: [
        "正在上海领金，医保基金代缴状态正常",
        "个人身份续缴养老的登记条件、缴费状态已确认",
      ],
      steps: [
        "先查询失业金与医保代缴记录",
        "在随申办搜索“灵活就业一件事”，核实个人养老续缴登记",
        "选择缴费基数并按官方渠道缴费，次月核对到账记录",
      ],
      sourceIds: [
        "benefit-medical",
        "benefit-pension",
        "pension",
        "flexible",
        "retirement",
      ],
    },
    {
      id: "flexible",
      title: "灵活就业，个人参保",
      subtitle: "有实际灵活就业，核实资格后办理",
      medical:
        "按灵活就业身份缴纳职工医保（含生育保险），按当前基数与10%费率计算。仅缴医保的支持方式需经办确认。",
      pension: "个人缴纳职工养老，现行费率20%；基数可在本地上下限范围内选择。",
      conditions: [
        "在上海实际从事灵活就业且符合参保条件",
        "未重复参加单位或其他不兼容的基本医保",
        "核实待遇等待期及可否适用衔接例外",
      ],
      steps: [
        "通过随申办“灵活就业一件事”或社区事务受理中心核对资格",
        "确认参保险种、缴费基数和医保待遇起始日",
        "通过税务官方渠道缴费并查询参保及待遇记录",
      ],
      sourceIds: ["flexible", "pension", "medical", "waiting", "base"],
    },
    {
      id: "resident",
      title: "符合条件，居民保障",
      subtitle: "按年缴医保，先确认参保范围",
      medical:
        "城乡居民医保按年缴费，与职工医保的待遇、资格及生效时间不同。这里只列2026年超过18周岁、不满60周岁档参考。",
      pension: "居民养老资格与缴费需单独核实，本页医保费用不包含居民养老。",
      conditions: [
        "不参加其他基本医保，且符合上海居民医保范围",
        "年费示例仅适用所标年龄档及2026年度",
        "办理前确认本年度登记、等待期及待遇起始日",
      ],
      steps: [
        "向社区事务受理中心或医保经办机构核实居民医保资格",
        "在随申办搜索“城乡居民基本医疗保险登记”",
        "审核通过后按税务官方渠道缴费，核实待遇起始时间",
      ],
      sourceIds: ["resident", "resident-price", "resident-waiting"],
    },
    {
      id: "employed",
      title: "重新就业，单位参保",
      subtitle: "由单位依法办理，个人承担规定份额",
      medical:
        "与单位确认职工医保增员月份与待遇衔接，不能用个人自费参保替代单位法定义务。",
      pension:
        "由单位依法办理职工养老；个人承担法定个人部分，本页不估算工资相关的单位缴费账单。",
      conditions: [
        "与用人单位建立劳动关系",
        "确认个人参保和领金状态变更，避免重复参保",
      ],
      steps: [
        "向单位人事确认社保增员月份与缴费基数",
        "按规定及时办理失业金停领，核对个人参保停缴或变更",
        "查询下一缴费期的养老、医保及待遇记录",
      ],
      sourceIds: ["law", "benefit-medical"],
    },
  ],
  sources: [
    {
      id: "base",
      title: "2026年7月起社保缴费基数上下限",
      institution: "上海市人社局",
      url: "https://rsj.sh.gov.cn/tdjjf_17554/20260824/t0035_1443297.html",
    },
    {
      id: "pension",
      title: "灵活就业养老20% · 沪人社规〔2024〕3号",
      institution: "上海市人社局等",
      url: "https://www.shanghai.gov.cn/gwk/search/content/t0035_1421365",
    },
    {
      id: "medical",
      title: "医保费率10% · 沪医保规〔2026〕2号",
      institution: "上海市医保局等",
      url: "https://ybj.sh.gov.cn/gfxwj/20260313/921e047144694b61b6df8ca0c5ef2cfc.html",
    },
    {
      id: "account",
      title: "2026医保年度个人账户计入标准",
      institution: "上海市医保局",
      url: "https://www.shanghai.gov.cn/gwk/search/content/dbe0d00f57084f95925e6c6df2f0e15a",
    },
    {
      id: "account-rules",
      title: "个人账户预计入与清算 · 沪医保规〔2025〕6号",
      institution: "上海市医保局",
      url: "https://ybj.sh.gov.cn/gfxwj/20250905/92f9452f95e649ec824345e341f73ee3.html",
    },
    {
      id: "benefit-medical",
      title: "领金人员医保基金代缴 · 沪医保规〔2025〕11号",
      institution: "上海市医保局等",
      url: "https://ybj.sh.gov.cn/gfxwj/20260109/796e6c63537d41b3a319dd40929ad6c4.html",
    },
    {
      id: "benefit-pension",
      title: "领金期间个人缴养老不影响待遇的官方答疑",
      institution: "人力资源社会保障部",
      url: "https://app.www.gov.cn/govdata/gov/202405/15/514987/article.html",
    },
    {
      id: "flexible",
      title: "灵活就业参保条件 · 沪人社规〔2023〕5号",
      institution: "上海市人社局等",
      url: "https://rsj.sh.gov.cn/tshbx_17729/20260520/t0035_1415199.html",
    },
    {
      id: "waiting",
      title: "职工医保等待期与衔接 · 沪医保规〔2025〕7号",
      institution: "上海市医保局",
      url: "https://ybj.sh.gov.cn/gfxwj/20250905/6173c838284f43c3b4d8c8d4513364ed.html",
    },
    {
      id: "resident",
      title: "城乡居民医保适用范围 · 沪府规〔2025〕12号",
      institution: "上海市人民政府",
      url: "https://www.shanghai.gov.cn/202602zfwj/20260122/dd5803f7d07b4b53ae92f1c1e64e3595.html",
    },
    {
      id: "resident-price",
      title: "2026居民医保缴费标准（非2027年缴费报价）",
      institution: "上海市医保局等",
      url: "https://www.shanghai.gov.cn/202605bmgfxwj/20260311/b60579a7ade14caa8e5673b1d8c26c37.html",
    },
    {
      id: "resident-waiting",
      title: "居民医保登记缴费与待遇等待期",
      institution: "上海市医保局",
      url: "https://ybj.sh.gov.cn/jb_cbjfl/20260630/e0074749506f413bb62d1e2ed45a1a17.html",
    },
    {
      id: "retirement",
      title: "大龄领金人员养老缴费支持 · 沪人社规〔2025〕1号",
      institution: "上海市人社局等",
      url: "https://www.shanghai.gov.cn/gwk/search/content/t0035_1429890",
    },
    {
      id: "law",
      title: "社会保险法",
      institution: "全国人大常委会",
      url: "https://chinajob.mohrss.gov.cn/c/2010-10-29/33172.shtml",
    },
  ],
});
export const defaultInsuranceRecords: InsuranceRecord[] = [
  { draft: defaultInsurancePolicy, published: defaultInsurancePolicy },
];
