import type { ContentSummary } from "@uh/contracts";
export const topics = [
  {
    key: "benefits",
    title: "失业指南",
    subtitle: "申领条件与流程",
    icon: "benefits",
    tone: "blue",
    intro: "失业后先办什么、去哪里办，按步骤看清楚。",
  },
  {
    key: "insurance",
    title: "社保医保",
    subtitle: "断缴与衔接",
    icon: "insurance",
    tone: "green",
    intro: "先核对个人参保状态，再确认适用的衔接方式。",
  },
  {
    key: "rights",
    title: "离职权益",
    subtitle: "材料与权益准备",
    icon: "rights",
    tone: "orange",
    intro: "整理离职材料、沟通记录与需要确认的权益问题。",
  },
  {
    key: "training",
    title: "培训补贴",
    subtitle: "培训与考证信息",
    icon: "training",
    tone: "violet",
    intro: "先了解报名条件、真实费用和当地补贴规定。",
  },
  {
    key: "jobs",
    title: "求职指南",
    subtitle: "简历与面试准备",
    icon: "jobs",
    tone: "teal",
    intro: "找正规机会、做好准备，把求职进展记下来。",
  },
  {
    key: "safety",
    title: "防骗指南",
    subtitle: "识别招聘陷阱",
    icon: "safety",
    tone: "pink",
    intro: "对先收费、索要验证码和不明招聘渠道保持警惕。",
  },
] as const;
export type TopicKey = (typeof topics)[number]["key"];
export function thumbnailFor(item: Pick<ContentSummary, "issueKeys" | "id">) {
  const issue = item.issueKeys[0];
  const name =
    issue === "benefits"
      ? "city"
      : issue === "living"
        ? "living"
        : issue || "jobs";
  return "/static/blue/thumb-" + name + ".jpg";
}
