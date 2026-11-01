<script setup lang="ts">
import { computed, ref } from "vue";
import { onShow, onPullDownRefresh, onShareAppMessage } from "@dcloudio/uni-app";
import type { HomeSection } from "@uh/contracts";
import { calculateBudget, formatMoney, parseMoney, type BudgetInput } from "@uh/tool-core";
import { useCatalog } from "../../stores/catalog";
import { usePreferences } from "../../stores/preferences";
import { usePersonal } from "../../stores/personal";
import { go } from "../../services/navigation";
import TopBar from "../../components/TopBar.vue";
import BlueIcon from "../../components/BlueIcon.vue";
const p = usePreferences(), catalog = useCatalog(), personal = usePersonal();
const budget = ref<ReturnType<typeof calculateBudget> | null>(null);
const pending = computed(() => personal.tasks.filter((t) => !t.deleted && t.state === "todo"));
const applications = computed(() => personal.applications.filter((a) => !a.deleted));
function readBudget() {
  budget.value = null;
  try {
    const draft = uni.getStorageSync("uhb:v1:budget");
    const keys: (keyof BudgetInput)[] = ["savingsCents", "monthlyIncomeCents", "housingCents", "livingCents", "insuranceCents", "otherCents", "reserveCents"];
    if (!draft || keys.some((key) => typeof draft[key] !== "string" || parseMoney(draft[key]) === null)) return;
    budget.value = calculateBudget(Object.fromEntries(keys.map((key) => [key, parseMoney(draft[key])!])) as unknown as BudgetInput);
  } catch { /* Keep the entry available when no valid local budget exists. */ }
}
function refresh() {
  readBudget();
  return Promise.all([catalog.refreshHome(), catalog.refresh()]);
}
onShow(() => void refresh());
onPullDownRefresh(async () => {
  await refresh();
  uni.stopPullDownRefresh();
});
function openSection(section: HomeSection) {
  const paths: Record<string, string> = {
    "benefit-center": "/pages/benefits/index",
    insurance: "/package-insurance/home/index",
    training: "/package-training/home/index",
  };
  if (paths[section.destination]) go(paths[section.destination]);
}
function chooseCity() {
  uni.showActionSheet({
    itemList: ["上海", "全国通用"],
    success: (r) => p.update({ region: r.tapIndex === 0 ? "310000" : "national" }),
  });
}
onShareAppMessage(() => ({ title: "失业有数 · 把下一步安排好", path: "/pages/home/index" }));
</script>
<template>
  <view class="home">
    <view class="hero-panel">
      <image class="hero-art" src="/static/blue/hero.jpg" mode="aspectFill" />
      <view class="hero-top-wash" />
      <TopBar title="失业有数" subtitle="陪你把下一步安排好" home>
        <button class="city-button" @tap="chooseCity">⌖ {{ p.value.region === "310000" ? "上海" : "全国" }}⌄</button>
      </TopBar>
      <view class="hero-message">
        <view class="hero-title">虽然暂时停下<br />但你依然在前进</view>
        <view class="hero-caption">理清收支 · 安排待办 · 记录每一次尝试</view>
      </view>
    </view>
    <view class="home-content">
      <view v-if="catalog.homeSections.length" class="topic-grid">
        <button v-for="topic in catalog.homeSections" :key="topic.id" class="topic-tile" @tap="openSection(topic)">
          <BlueIcon :name="topic.icon" :tone="topic.tone" :size="37" />
          <view class="topic-title">{{ topic.title }}</view>
          <view class="topic-subtitle">{{ topic.subtitle }}</view>
        </button>
      </view>
      <view class="section-title work-heading">我的下一步</view>
      <button v-if="catalog.available.includes('budget')" class="budget-card" @tap="go('/package-tools/budget/index')">
        <view class="row"><text class="card-label">生活预算</text><text class="card-action">{{ budget ? "调整预算" : "开始计算" }} ›</text></view>
        <template v-if="budget">
          <view v-if="budget.months !== null" class="budget-value">{{ budget.months }}<text>个月</text></view>
          <view v-else class="budget-covered">当前月收入覆盖必要支出</view>
          <view class="budget-caption">{{ budget.months === null ? "收支有变化，随时回来调整" : "按当前收支，可用资金预计可支撑" }}</view>
          <view class="budget-footer">每月必要支出 ¥{{ formatMoney(budget.expensesCents) }}</view>
        </template>
        <template v-else>
          <view class="budget-empty-title">先看清，这段时间的收支</view>
          <view class="budget-caption">输入存款与开销，估算资金能支撑多久</view>
        </template>
      </button>
      <view v-if="catalog.available.includes('tasks')" class="work-card">
        <button class="row card-entry" @tap="go('/pages/tasks/index')"><view class="card-title">我的待办 <text class="count">{{ pending.length }}</text></view><text class="entry-more">查看全部 ›</text></button>
        <view v-if="pending.length" class="task-list">
          <button v-for="task in pending.slice(0, 3)" :key="task.id" class="home-task" @tap="personal.setTask({ ...task, state: 'done' })"><text class="task-circle" /><text class="task-name">{{ task.title }}</text></button>
        </view>
        <view v-else class="start-state"><view>把需要做的事，放进自己的清单</view><button class="start-button" @tap="go('/pages/tasks/index')">安排一件事 →</button></view>
        <view v-if="!personal.saved" class="notice warning">保存失败，请到待办页重试保存。</view>
      </view>
      <button v-if="catalog.available.includes('applications')" class="work-card job-card" @tap="go('/package-records/applications/index')">
        <view class="row"><view class="card-title">求职进度</view><text class="entry-more">记录机会 ›</text></view>
        <view class="job-stats"><view v-for="status in ['已投递', '面试中', '已获录用']" :key="status"><text class="job-number">{{ applications.filter((a) => a.status === status).length }}</text><text class="job-label">{{ status }}</text></view></view>
        <view class="job-caption">{{ applications.length ? "投递、面试和下一步，都在这里继续" : "从记录一个感兴趣的岗位开始" }}</view>
      </button>
    </view>
  </view>
</template>
<style scoped>
.home { max-width: 560px; margin: auto; background: linear-gradient(#eef5ff, #f6f8fb 550px); padding-bottom: 28px; }
.hero-panel { height: 268px; position: relative; overflow: hidden; background: #d4e8ff; }
.hero-art { position: absolute; inset: 0; width: 100%; height: 100%; }
.hero-top-wash { position: absolute; inset: 0; background: linear-gradient(180deg, #c3dfff55, transparent 65%, #d8e8ff9c); }
.city-button { margin-left: auto; background: #ffffffdf; border: 1px solid #fff; border-radius: 22px; min-width: 60px; min-height: 40px; padding: 7px 10px; font-size: 12px; white-space: nowrap; }
.hero-message { position: relative; padding: 15px 26px; }
.hero-title { font-family: "Songti SC", "STSong", serif; font-weight: 700; font-size: 24px; color: #102b5c; line-height: 1.55; }
.hero-caption { display: inline-block; font-size: 10px; color: #52729d; margin-top: 9px; padding: 4px 8px; border-radius: 8px; background: #ffffffb3; }
.home-content { padding: 14px 14px 0; }
.topic-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 9px; }
.topic-tile { width: 100%; background: #ffffffea; border-radius: 16px; min-height: 110px; padding: 14px 3px 11px; display: flex; align-items: center; flex-direction: column; }
.topic-title { font-size: 15px; font-weight: 600; margin-top: 8px; color: #26314a; }
.topic-subtitle { font-size: 10px; color: #929db1; margin-top: 2px; white-space: nowrap; }
.work-heading { margin: 24px 3px 12px; }
.budget-card { width: 100%; text-align: left; border-radius: 20px; padding: 20px; color: #fff; background: linear-gradient(120deg, #246be5, #3c88ff); box-shadow: 0 8px 24px #3978da1c; }
.card-label { font-size: 14px; font-weight: 600; }
.card-action { font-size: 12px; opacity: .85; }
.budget-value { font-size: 44px; font-weight: 650; line-height: 1.35; margin-top: 15px; font-variant-numeric: tabular-nums; }
.budget-value text { font-size: 14px; font-weight: 400; margin-left: 8px; }
.budget-covered, .budget-empty-title { font-size: 21px; font-weight: 600; margin-top: 18px; line-height: 1.5; }
.budget-caption { font-size: 12px; opacity: .8; margin-top: 5px; line-height: 1.8; }
.budget-footer { margin-top: 16px; border-top: 1px solid #ffffff30; padding-top: 12px; font-size: 12px; }
.work-card { display: block; width: 100%; text-align: left; background: #fff; border-radius: 18px; border: 1px solid #edf1f7; padding: 18px; margin-top: 14px; }
.card-entry { width: 100%; text-align: left; min-height: 32px; }
.card-title { font-size: 17px; font-weight: 600; }
.count { color: #8193ac; font-size: 13px; font-weight: 400; margin-left: 5px; }
.entry-more { font-size: 12px; color: #8c9bb1; }
.home-task { display: flex; align-items: center; gap: 11px; width: 100%; text-align: left; min-height: 52px; padding: 10px 0; border-bottom: 1px solid #f0f3f7; }
.home-task:last-child { border-bottom: 0; }
.task-circle { flex-shrink: 0; width: 22px; height: 22px; border: 1.5px solid #bdcde4; border-radius: 7px; }
.task-name { font-size: 14px; line-height: 1.7; }
.start-state { color: #8997ac; font-size: 12px; padding-top: 12px; }
.start-button { min-height: 44px; color: #387ce4; font-size: 13px; margin-top: 8px; text-align: left; }
.job-stats { display: grid; grid-template-columns: repeat(3, 1fr); margin-top: 16px; }
.job-stats > view { display: flex; flex-direction: column; gap: 3px; }
.job-number { font-size: 27px; font-weight: 600; color: #367be0; line-height: 1.4; }
.job-label, .job-caption { font-size: 11px; color: #8d9bb0; }
.job-caption { border-top: 1px solid #f0f3f7; padding-top: 13px; margin-top: 16px; }
/* #ifdef MP-WEIXIN */
.hero-panel { height: 310px; }
/* #endif */
</style>
