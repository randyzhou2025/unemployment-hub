import type { Draft, Source } from "@uh/contracts";
import { stages } from "@uh/domain";
const verifiedAt = "2026-10-19T00:52:11.000Z";
export const seedSources: Source[] = [
  {
    id: "sh-benefit",
    title: "上海市失业保险金申领发放实施办法政策问答",
    institution: "上海市人力资源和社会保障局",
    url: "https://rsj.sh.gov.cn/tzcjd_17352_17352/20260812/t0035_1443066.html",
    publishedAt: "2026-08-06",
    verifiedAt,
  },
  {
    id: "sh-one",
    title: "登记失业人员就业帮扶一件事",
    institution: "上海一网通办",
    url: "https://zwdt.sh.gov.cn/govPortals/bsfw/onething/31LB00022700",
    publishedAt: null,
    verifiedAt,
  },
  {
    id: "sh-jobs",
    title: "上海公共招聘服务入口",
    institution: "上海市人力资源和社会保障局",
    url: "https://jobs.rsj.sh.gov.cn/",
    publishedAt: null,
    verifiedAt,
  },
];
const defaults: Draft = {
  kind: "article",
  title: "",
  summary: "",
  stageKeys: ["newly"],
  issueKeys: ["living"],
  scope: "national",
  regionIds: [],
  markdown: "",
  keyPoints: [],
  sourceRefs: [],
  effectiveFrom: null,
  effectiveTo: null,
  reviewDueAt: "2026-11-19",
  attribution: "editorial",
  tasks: [],
  resourceUrl: null,
};
const make = (input: Partial<Draft>): Draft => ({ ...defaults, ...input });
const guideTasks: Record<
  string,
  { key: string; title: string; note: string }[]
> = {
  preparing: [
    {
      key: "employment-docs",
      title: "整理自己的劳动关系与工资材料",
      note: "保存属于自己的劳动合同、工资记录及通知；不要带走公司的保密资料。",
    },
    {
      key: "handover",
      title: "确认离职日期、交接和材料领取安排",
      note: "将需确认的问题写下来，保留正式沟通记录。",
    },
    {
      key: "rights-question",
      title: "列出权益问题并寻找正式咨询渠道",
      note: "补偿与程序需结合具体情况判断，不凭通用文章作确定结论。",
    },
  ],
  newly: [
    {
      key: "registration",
      title: "查看所在地失业登记与就业帮扶渠道",
      note: "先核对官方指南中的受理条件及材料。",
    },
    {
      key: "insurance-status",
      title: "核对个人社保医保与待遇状态",
      note: "向当地经办机构确认自己的衔接安排。",
    },
    {
      key: "first-budget",
      title: "整理当前余额与每月固定支出",
      note: "使用生活预算工具形成初步安排。",
    },
  ],
  between: [
    {
      key: "review-budget",
      title: "重新检查未来一个月的必要开销",
      note: "区分固定支出、可调整开销和备用金。",
    },
    {
      key: "support",
      title: "查找适用的公共服务与支持资源",
      note: "不要向不明中介提供银行卡或验证码。",
    },
    {
      key: "weekly-routine",
      title: "为这一周安排一件可以完成的小事",
      note: "可以是整理材料、联系朋友，或完成一次投递。",
    },
  ],
  seeking: [
    {
      key: "target-role",
      title: "写下优先考虑的岗位与工作条件",
      note: "先明确地点、时间与收入底线，便于比较机会。",
    },
    {
      key: "resume-ready",
      title: "准备一份针对目标岗位的简历",
      note: "用真实经历说明做过什么及结果，不虚构项目。",
    },
    {
      key: "track-jobs",
      title: "记录投递与下一步跟进",
      note: "把公司、岗位、面试和待办放在同一处。",
    },
  ],
  rejoining: [
    {
      key: "onboarding",
      title: "确认入职材料、时间和书面约定",
      note: "留存本人合同与入职资料。",
    },
    {
      key: "benefit-transition",
      title: "按当地要求核对就业登记和待遇状态",
      note: "重新就业后及时确认需办理的衔接手续。",
    },
    {
      key: "archive-search",
      title: "整理求职记录，保留需要跟进的联系",
      note: "已结束的机会可标为已归档，不自动删除记录。",
    },
  ],
};
export const seedContents: { id: string; draft: Draft }[] = [
  ...stages.map((s) => ({
    id: "guide-" + s.key,
    draft: make({
      kind: "guide",
      title: s.label + "：从这三件事开始",
      summary: s.description,
      stageKeys: [s.key],
      issueKeys:
        s.key === "seeking"
          ? ["jobs"]
          : s.key === "preparing"
            ? ["rights"]
            : ["living"],
      markdown:
        "## 不用一次把所有事都处理完\n\n" +
        s.description +
        "\n\n这是一份编辑整理的通用行动清单，你可以跳过不适用的项目，也可以随时切换阶段。涉及政策及个人权益的事项，请按所在地规定和官方答复核实。\n\n## 按自己的节奏推进\n\n完成实际办理或准备后，再勾选对应事项。清单只保存在当前设备，不会改变任何官方登记状态。",
      keyPoints: [
        "阶段可以随时切换，原有记录会保留。",
        "完成后再勾选；不适用的事项可以跳过。",
      ],
      tasks: guideTasks[s.key],
    }),
  })),
  {
    id: "sh-benefit-monthly",
    draft: make({
      title: "失业保险金还要每三个月申领吗？上海新旧安排分开看",
      summary: "新办法下的按月发放，与此前已经在领的人员衔接安排有所不同。",
      stageKeys: ["newly", "between"],
      issueKeys: ["benefits"],
      scope: "specified_regions",
      regionIds: ["310000"],
      attribution: "policy_summary",
      sourceRefs: [seedSources[0]],
      effectiveFrom: "2026-08-16",
      markdown:
        "## 先确认自己的待遇状态\n\n上海官方政策问答介绍，新办法自2026年8月16日起实施。申领经审核通过后，待遇按月发放；此前已处于领取状态的人员，需留意原申领周期结束后的衔接安排。\n\n## 按月发放不等于自动符合资格\n\n是否可以领取、可领取月数以及是否发生停发情形，都需要结合个人情况核定。本工具不作资格认定。\n\n## 下一步怎么做\n\n在随申办或经办窗口核对本人状态，再阅读下方官方政策问答中的对应情形。",
      keyPoints: [
        "区分新申领与原领金人员。",
        "资格、期限及停发情形需分别核对。",
      ],
    }),
  },
  {
    id: "prepare-documents",
    draft: make({
      title: "离职前，给自己留一份材料清单",
      summary: "把合同、工资记录和交接安排分开整理，之后查找更省力。",
      stageKeys: ["preparing"],
      issueKeys: ["rights"],
      markdown:
        "## 先整理属于自己的材料\n\n将本人的劳动合同、工资记录、相关正式通知和离职材料放在容易找到的位置。涉及公司机密或其他人的个人信息，不要复制或带走。\n\n## 把需要确认的问题写下来\n\n离职日期、交接范围、材料领取方式及尚未结清事项，可以分别列出，在正式沟通时逐项确认。\n\n## 权益有疑问，保留事实再咨询\n\n具体补偿和程序可能因情况不同而变化。这篇文章提供准备思路，不能替代对个案的专业判断。",
      keyPoints: [
        "个人材料与公司保密资料分清楚。",
        "先列出问题，再寻求正式答复。",
      ],
    }),
  },
  {
    id: "living-budget",
    draft: make({
      title: "把生活预算算清楚，不必先压缩每一笔开销",
      summary: "余额、固定支出、确定收入和备用金，分开看更容易作安排。",
      stageKeys: ["newly", "between"],
      issueKeys: ["living"],
      markdown:
        "## 先看必要支出\n\n列出房租、日常生活、保障缴费和其他固定支出。不要为了得到一个好看的数字，漏掉确定会发生的开销。\n\n## 只计入比较确定的收入\n\n还未核定的待遇、尚未到账的补偿或不确定的兼职收入，先不要当作稳定月收入。\n\n## 为意外留一点空间\n\n生活预算会在余额中先扣除你想保留的备用金，再按每月资金缺口估算可支撑的时间。这个结果基于固定月收支假设，不是财务承诺。",
      keyPoints: ["不确定的收入先不计入。", "预算可以调整，不需要一次算准。"],
    }),
  },
  {
    id: "job-records",
    draft: make({
      title: "投过哪些岗位？用一张记录，把跟进从记忆里拿出来",
      summary: "公司、岗位、投递状态和下一步，记录这四项就够开始。",
      stageKeys: ["seeking"],
      issueKeys: ["jobs"],
      markdown:
        "## 先记四件事\n\n公司、岗位、当前进展、下一步跟进。记录不需要复杂，能在下次沟通前快速找到就有价值。\n\n## 面试之后补一条具体信息\n\n写下沟通中确认的工作要求、对方约定的时间，或自己还想了解的问题。避免只写“感觉不错”。\n\n## 拒绝与归档也属于进展\n\n一次机会结束后，可以保留信息并标记为已归档。记录用来帮助安排下一步，不用来给自己打分。",
      keyPoints: [
        "只记录对下次行动有帮助的信息。",
        "记录只保存在本机，记得导出备份。",
      ],
    }),
  },
  {
    id: "rejoin-checklist",
    draft: make({
      title: "收到录用通知后，还有哪些衔接事项要核对？",
      summary: "确认书面约定、入职准备与保障衔接，让新的开始更从容。",
      stageKeys: ["rejoining"],
      issueKeys: ["jobs", "insurance"],
      markdown:
        "## 先确认书面安排\n\n入职时间、工作地点、岗位要求和材料清单，尽量按正式通知逐一核对。对仍不清楚的条款，在签署前询问清楚。\n\n## 核对当地保障衔接要求\n\n重新就业可能影响原有登记及相关待遇。主动查看当地官方说明，向经办机构确认自己需要完成哪些手续。\n\n## 给旧记录一个去处\n\n将不再跟进的岗位归档，保留重要沟通与个人材料。切换为重新就业阶段，不会清空原有清单、收藏或预算。",
      keyPoints: ["书面约定有疑问，先问清楚。", "切换阶段不会删除原有记录。"],
    }),
  },
  {
    id: "insurance-next-step",
    draft: make({
      title: "离职后社保医保怎么衔接？先核对这三件事",
      summary: "先查参保状态，再确认当地衔接路径，别把别人的办理经验直接套用。",
      stageKeys: ["newly", "between", "rejoining"],
      issueKeys: ["insurance"],
      keyPoints: [
        "先核对当前参保与待遇状态。",
        "不同地区、不同身份的衔接方式可能不同。",
        "具体缴费与待遇，向当地经办机构确认。",
      ],
      markdown:
        "## 先查当前状态\n\n离职日期、原单位申报情况和实际参保记录可能并不完全同步。先通过当地官方渠道核对个人状态，不凭聊天记录判断已经断缴或自动衔接。\n\n## 分开确认适用方式\n\n是否正在领取失业保险待遇、是否从事灵活就业、是否跨地区流动，都是咨询时需要说明的情况。本文不据此认定你适用某条待遇政策。\n\n## 把问题一次问清楚\n\n办理前，向当地人社或医保经办机构确认材料、办理时间、缴费及待遇衔接安排，保留官方答复和办理记录。",
    }),
  },
  {
    id: "training-before-signup",
    draft: make({
      title: "培训补贴怎么查？报名前先核对四项信息",
      summary: "补贴目录、个人条件、报名主体与真实费用，分开确认更清楚。",
      stageKeys: ["between", "seeking"],
      issueKeys: ["training"],
      keyPoints: [
        "有证书，不等于一定能领补贴。",
        "区分报名费、评价费和培训费。",
        "优先查当地人社公开信息。",
      ],
      markdown:
        "## 先确认项目与个人条件\n\n同一个证书项目，在不同地区的支持安排可能不同。先找当地人社部门公布的目录与申请说明，分别核对项目、个人条件和时间要求。\n\n## 问清楚谁负责报名\n\n了解能否个人报名、哪个主体组织、何时考试，不把机构咨询页面当作官方认定。\n\n## 把费用拆开比较\n\n分别了解报名费、评价费、培训费和资料费。没有确认的补贴不要提前当作确定收入。\n\n## 保留资料再决定\n\n保存政策链接、机构资质、费用说明与约定内容，不清楚的条件先向官方确认。",
    }),
  },
  {
    id: "job-safety-pay-first",
    draft: make({
      title: "找工作先交钱？遇到这些情况先停一停",
      summary: "不明收费、索要验证码、借用账户和虚假招聘，先核实再行动。",
      stageKeys: ["preparing", "newly", "between", "seeking"],
      issueKeys: ["safety"],
      keyPoints: [
        "不向陌生招聘方提供验证码或账户权限。",
        "先核对公司与岗位，再考虑付费培训。",
        "保留招聘信息、沟通记录与转账凭证。",
      ],
      markdown:
        "## 先核对招聘主体\n\n对方能否说明公司、岗位、地点和招聘流程？优先通过企业正式渠道或公共招聘服务核对，不能只凭群名或头像建立信任。\n\n## 对先收费的要求多问一步\n\n对押金、设备费、名额费或先培训再入职的安排，先了解服务、费用主体和约定内容，不因催促立即转账。\n\n## 保护账户与身份信息\n\n不提供验证码，不交出银行卡或支付账户，不通过不明链接提交敏感证件。\n\n## 异常时先保留证据\n\n保存原始页面、聊天和付款记录。怀疑被骗时，及时向官方报警或反诈渠道咨询，不继续按陌生人的指示转账。",
    }),
  },
  ...seedSources.map((source, i) => ({
    id: ["resource-help", "resource-service", "resource-jobs"][i],
    draft: make({
      kind: "resource",
      title: [
        "上海失业保险金官方政策问答",
        "上海就业帮扶一件事",
        "上海公共招聘服务",
      ][i],
      summary: [
        "查看申领条件、办理渠道和新旧人员衔接说明。",
        "集中了解失业登记、就业服务和培训等办事事项。",
        "从人社部门提供的正规入口查找工作机会。",
      ][i],
      stageKeys: ["newly", "between", "seeking", "rejoining"],
      issueKeys: i === 2 ? ["jobs"] : ["benefits", "training"],
      scope: "specified_regions",
      regionIds: ["310000"],
      attribution: "official_navigation",
      sourceRefs: [source],
      resourceUrl: source.url,
      markdown:
        "## 使用方式\n\n这是官方公开网站的导航。小程序内提供来源与链接复制，你可以在浏览器中打开。实际受理条件、办理材料与服务结果，以官方页面及经办答复为准。\n\n## 保护个人信息\n\n请核对网站主体，不向陌生中介提供验证码或银行卡信息。",
    }),
  })),
];
