export const stages = [
  {
    key: "preparing",
    label: "离职准备",
    short: "离职准备",
    headline: "先把自己的权益和材料理清",
    description: "交接、材料、权益，把离职前的事情逐一安排好。",
  },
  {
    key: "newly",
    label: "刚失业",
    short: "刚失业",
    headline: "先稳住生活，再安排下一步",
    description: "登记、保障、收支，不用今天就解决所有问题。",
  },
  {
    key: "between",
    label: "失业持续期",
    short: "生活过渡",
    headline: "让这段过渡期，多一点确定感",
    description: "看清日常开销，也给生活留一些余地。",
  },
  {
    key: "seeking",
    label: "求职与转型",
    short: "求职转型",
    headline: "把每一次尝试，变成看得见的进展",
    description: "整理机会、准备面试，找到适合自己的节奏。",
  },
  {
    key: "rejoining",
    label: "重新就业",
    short: "重新就业",
    headline: "新的开始，也把衔接的事做好",
    description: "入职材料、保障衔接和旧记录，都有条不紊。",
  },
] as const;
export type StageKey = (typeof stages)[number]["key"];
export const regions = [
  { id: "national", label: "全国通用" },
  { id: "310000", label: "上海" },
] as const;
export const issues = [
  { key: "rights", label: "离职权益" },
  { key: "benefits", label: "失业待遇" },
  { key: "insurance", label: "社保医保" },
  { key: "living", label: "生活安排" },
  { key: "jobs", label: "求职转型" },
  { key: "training", label: "培训补贴" },
  { key: "safety", label: "防骗指南" },
] as const;
export const tools = [
  {
    id: "benefit-calculator",
    name: "失业金金额试算",
    description: "按核定及已领取月数，算清分段金额",
    icon: "wallet",
    path: "/package-tools/benefit/index",
  },
  {
    id: "tasks",
    name: "阶段行动清单",
    description: "把下一步，拆成可以完成的小事",
    icon: "check",
    path: "/package-records/tasks/index",
  },
  {
    id: "budget",
    name: "生活预算",
    description: "看清收支，估算资金能支撑多久",
    icon: "wallet",
    path: "/package-tools/budget/index",
  },
  {
    id: "applications",
    name: "求职记录",
    description: "投递、面试与下一步，集中管理",
    icon: "briefcase",
    path: "/package-records/applications/index",
  },
  {
    id: "resources",
    name: "官方渠道",
    description: "办理、求职和培训，从正规入口开始",
    icon: "compass",
    path: "/pages/resources/index",
  },
] as const;
export const applicationStatuses = [
  "待投递",
  "已投递",
  "面试中",
  "已获录用",
  "暂未通过",
  "已归档",
] as const;
export const homeDestinations = [
  { key: "benefit-center", label: "失业金专题" },
  { key: "benefits", label: "失业指南资讯" },
  { key: "insurance", label: "社保医保资讯" },
  { key: "rights", label: "离职权益资讯" },
  { key: "training", label: "培训补贴资讯" },
  { key: "jobs", label: "求职转型资讯" },
  { key: "safety", label: "防骗资讯" },
  { key: "living", label: "生活安排资讯" },
] as const;
export const defaultHomeSections = [
  {
    id: "unemployment-benefit",
    title: "失业金",
    subtitle: "金额、政策与试算",
    icon: "budget",
    tone: "blue",
    destination: "benefit-center",
    enabled: true,
  },
  {
    id: "benefits",
    title: "失业指南",
    subtitle: "申领条件与流程",
    icon: "benefits",
    tone: "blue",
    destination: "benefits",
    enabled: true,
  },
  {
    id: "insurance",
    title: "社保医保",
    subtitle: "断缴与衔接",
    icon: "insurance",
    tone: "green",
    destination: "insurance",
    enabled: true,
  },
  {
    id: "rights",
    title: "离职权益",
    subtitle: "材料与权益准备",
    icon: "rights",
    tone: "orange",
    destination: "rights",
    enabled: true,
  },
  {
    id: "training",
    title: "培训补贴",
    subtitle: "培训与考证信息",
    icon: "training",
    tone: "violet",
    destination: "training",
    enabled: true,
  },
  {
    id: "jobs",
    title: "求职指南",
    subtitle: "简历与面试准备",
    icon: "jobs",
    tone: "teal",
    destination: "jobs",
    enabled: true,
  },
  {
    id: "safety",
    title: "防骗指南",
    subtitle: "识别招聘陷阱",
    icon: "safety",
    tone: "pink",
    destination: "safety",
    enabled: true,
  },
] as const;
export const brand = {
  name: "失业有数",
  subtitle: "专业 · 可靠 · 陪你度过这段时光",
};
export function isStage(value: unknown): value is StageKey {
  return stages.some((s) => s.key === value);
}
export function applicable(scope: string, regionIds: string[], region: string) {
  return scope === "national" || regionIds.includes(region);
}
