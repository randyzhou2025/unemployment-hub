<script setup lang="ts">
import { computed, ref, watch } from "vue";
import {
  onShow,
  onPullDownRefresh,
  onShareAppMessage,
} from "@dcloudio/uni-app";
import type { BenefitPolicyResult } from "@uh/contracts";
import { formatMoney } from "@uh/tool-core";
import { request } from "../../services/http";
import { usePreferences } from "../../stores/preferences";
import { useCatalog } from "../../stores/catalog";
import { useContentList } from "../../services/content";
import { go } from "../../services/navigation";
import BlueIcon from "../../components/BlueIcon.vue";
import ContentCard from "../../components/ContentCard.vue";
import ListState from "../../components/ListState.vue";
const p = usePreferences(),
  catalog = useCatalog();
const data = ref<BenefitPolicyResult | null>(null),
  loading = ref(true),
  error = ref("");
const policy = computed(() => data.value?.policy);
const stateMessage = computed(
  () =>
    ({
      expired: "此政策文件已到期，展示历史标准，请以官方新公告为准。",
      needs_review: "最新标准暂不可用，请查看官方政策。",
      upcoming: "以下政策尚未生效，请留意执行日期。",
      current: "",
    })[data.value?.state || "current"],
);
const list = useContentList(() => ({
  region: p.value.region,
  issue: "benefits",
  kind: "article",
}));
let generation = 0;
async function loadPolicy() {
  const mine = ++generation;
  loading.value = true;
  error.value = "";
  data.value = null;
  try {
    const result = await request<BenefitPolicyResult>(
      "/api/v1/benefit-policy?region=" + p.value.region,
    );
    if (mine === generation) data.value = result;
  } catch (e) {
    if (mine === generation) error.value = (e as Error).message;
  } finally {
    if (mine === generation) loading.value = false;
  }
}
async function refresh() {
  await Promise.all([loadPolicy(), list.load(), catalog.refresh()]);
}
onShow(() => void refresh());
watch(
  () => p.value.region,
  () => {
    list.items.value = [];
    list.nextCursor.value = null;
    void refresh();
  },
);
onPullDownRefresh(async () => {
  await refresh();
  uni.stopPullDownRefresh();
});
onShareAppMessage(() => ({
  title: "失业金 · 了解金额、政策与下一步",
  path: "/pages/benefits/index",
}));
function chooseCity() {
  uni.showActionSheet({
    itemList: ["上海", "全国通用"],
    success: (r) =>
      p.update({ region: r.tapIndex === 0 ? "310000" : "national" }),
  });
}
function jump(id: string) {
  uni.pageScrollTo({ selector: "#" + id, duration: 220 });
}
function copy(url: string) {
  uni.setClipboardData({ data: url });
}
</script>
<template>
  <view class="benefit-page">
    <view class="benefit-header"
      ><view class="heading-row"
        ><view
          ><view class="benefit-kicker">把保障先安排好</view
          ><view class="benefit-title">失业金</view></view
        ><button class="region" @tap="chooseCity">
          ⌖ {{ p.value.region === "310000" ? "上海" : "全国通用" }} ⌄
        </button></view
      ><view class="header-note">能领多少、怎么领，接下来做什么</view></view
    >
    <view class="anchor-bar"
      ><button @tap="jump('policy-data')">政策数据</button
      ><button :disabled="!policy" @tap="jump('policy-points')">申领要点</button
      ><button @tap="jump('benefit-news')">相关资讯</button
      ><button @tap="jump('benefit-tools')">实用工具</button></view
    >
    <view class="benefit-body">
      <view id="policy-data">
        <ListState
          :loading="loading"
          :error="error"
          :empty="false"
          @retry="loadPolicy"
        />
        <template v-if="policy">
          <view v-if="stateMessage" class="notice warning policy-state">{{
            stateMessage
          }}</view>
          <view class="amount-card"
            ><view class="amount-card-top"
              ><text>{{ policy.title }}</text
              ><text class="standard-label">{{
                data?.state === "current" ? "现行标准" : "参考标准"
              }}</text></view
            ><view class="standard-date"
              >{{ policy.effectiveFrom }} 起执行</view
            >
            <view class="amount-grid"
              ><view class="amount-cell"
                ><view class="amount"
                  >{{ formatMoney(policy.firstYearMonthlyCents)
                  }}<text>元/月</text></view
                ><view class="amount-label">第 1–12 个月</view></view
              ><view class="amount-cell"
                ><view class="amount"
                  >{{ formatMoney(policy.secondYearMonthlyCents)
                  }}<text>元/月</text></view
                ><view class="amount-label">第 13–24 个月</view></view
              ><view class="amount-cell"
                ><view class="amount secondary-amount"
                  >{{ formatMoney(policy.extensionMonthlyCents)
                  }}<text>元/月</text></view
                ><view class="amount-label">符合条件的延长领取</view></view
              ><view class="amount-cell"
                ><view class="amount secondary-amount"
                  >{{ policy.maxMonths }}<text>个月</text></view
                ><view class="amount-label">一次核定最长期限</view></view
              ></view
            >
            <view class="amount-foot"
              >金额标准文件有效至
              {{
                policy.effectiveTo
              }}。<br />具体领取期限与延长资格，以个人参保记录及官方核定为准。</view
            >
          </view>
        </template>
        <view v-else-if="!loading && !error" class="empty-region"
          ><BlueIcon name="location" tone="blue" :size="42" /><view
            class="empty-region-title"
            >失业金标准因地区而异</view
          ><view>选择上海，查看当地领取标准与办理方式。</view
          ><button class="primary" @tap="p.update({ region: '310000' })">
            查看上海政策
          </button></view
        >
      </view>
      <view id="policy-points" class="benefit-section" v-if="policy"
        ><view class="section-title">申领要点</view
        ><view class="section-note"
          >申领办法 {{ policy.rulesEffectiveFrom }} 起施行 · 有效至
          {{ policy.rulesEffectiveTo }}</view
        ><view class="policy-list"
          ><view
            v-for="(item, index) in policy.items"
            :key="index"
            class="policy-point"
            ><text class="point-index">{{ index + 1 }}</text
            ><view
              ><view class="point-title">{{ item.title }}</view
              ><view class="point-text">{{ item.text }}</view></view
            ></view
          ></view
        >
        <view class="source-panel"
          ><view class="source-heading">官方政策原文</view
          ><view class="source-hint">点击复制链接，在浏览器查看完整原文</view
          ><button
            v-for="source in policy.sources"
            :key="source.id"
            class="source-link"
            @tap="copy(source.url)"
          >
            <view
              ><view>{{ source.title }}</view
              ><text
                >{{ source.institution }} · {{ source.publishedAt }}</text
              ></view
            ><text class="source-arrow">↗</text>
          </button></view
        >
      </view>
      <view id="benefit-news" class="benefit-section"
        ><view class="section-title">最新失业金资讯</view
        ><view class="section-note"
          >{{ p.value.region === "310000" ? "上海及全国通用" : "全国通用" }} ·
          按发布时间排序</view
        ><view class="feed"
          ><ContentCard
            v-for="item in list.items.value"
            :key="item.id"
            :item="item"
          /><ListState
            :loading="list.loading.value"
            :error="list.error.value"
            :empty="!list.items.value.length"
            @retry="list.load()"
          /><button
            v-if="list.nextCursor.value !== null && !list.loading.value"
            class="more-news"
            @tap="list.load(true)"
          >
            查看更多资讯 ↓
          </button></view
        ></view
      >
      <view id="benefit-tools" class="benefit-section"
        ><view class="section-title">失业金相关工具</view
        ><view class="related-tools"
          ><button
            v-if="catalog.available.includes('benefit-calculator')"
            class="related-tool"
            @tap="go('/package-tools/benefit/index')"
          >
            <BlueIcon name="budget" tone="orange" :size="36" /><view
              class="tool-copy"
              ><view class="tool-title">失业金金额试算</view
              ><view class="tool-note">按核定月数，算清还可领多少</view></view
            ><text>›</text></button
          ><button
            v-if="catalog.available.includes('tasks')"
            class="related-tool"
            @tap="go('/pages/guide/detail?id=guide-newly')"
          >
            <BlueIcon name="check" tone="green" :size="36" /><view
              class="tool-copy"
              ><view class="tool-title">申领准备清单</view
              ><view class="tool-note">核对材料，安排下一步</view></view
            ><text>›</text></button
          ><button
            v-if="catalog.available.includes('resources')"
            class="related-tool"
            @tap="go('/pages/resources/index?issue=benefits')"
          >
            <BlueIcon name="link" tone="violet" :size="36" /><view
              class="tool-copy"
              ><view class="tool-title">官方办理渠道</view
              ><view class="tool-note">认准官方入口与办理机构</view></view
            ><text>›</text>
          </button></view
        ></view
      >
    </view>
  </view>
</template>
<style scoped>
.benefit-page {
  max-width: 560px;
  margin: auto;
  background: #f5f7fc;
  min-height: 100vh;
}
.benefit-header {
  padding: 22px 22px 24px;
  background: linear-gradient(125deg, #dceaff, #edf5ff);
}
.heading-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.benefit-kicker {
  font-size: 11px;
  color: #718bab;
  letter-spacing: 1px;
}
.benefit-title {
  font-size: 30px;
  font-weight: 700;
  color: #173464;
  margin-top: 5px;
}
.header-note {
  font-size: 13px;
  color: #748ba9;
  margin-top: 9px;
}
.region {
  margin: 0 0 0 auto;
  font-size: 12px;
  padding: 9px 12px;
  border-radius: 22px;
  background: #fff;
  color: #3d5e8a;
}
.anchor-bar {
  position: sticky;
  top: 0;
  z-index: 3;
  display: flex;
  padding: 4px 12px;
  background: #ffffffed;
  border-bottom: 1px solid #edf1f9;
}
.anchor-bar button {
  flex: 1;
  background: none;
  margin: 0;
  font-size: 12px;
  padding: 13px 0;
  color: #526c93;
}
.benefit-body {
  padding: 18px 16px 24px;
}
.amount-card {
  background: linear-gradient(130deg, #225dd4, #2e7aff 70%, #4c8bff);
  border-radius: 20px;
  padding: 20px;
  color: #fff;
  box-shadow: 0 9px 24px #3978da25;
}
.amount-card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 15px;
  font-weight: 600;
  gap: 8px;
}
.standard-label {
  font-size: 10px;
  white-space: nowrap;
  font-weight: 400;
  border: 1px solid #ffffff66;
  border-radius: 5px;
  padding: 3px 6px;
}
.standard-date {
  color: #d2e4ff;
  font-size: 11px;
  margin-top: 7px;
}
.amount-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin: 23px 0 18px;
  gap: 22px 14px;
}
.amount {
  font-size: 29px;
  font-weight: 650;
  letter-spacing: -0.7px;
  white-space: nowrap;
}
.amount text {
  font-size: 10px;
  letter-spacing: 0;
  font-weight: 400;
  margin-left: 4px;
  color: #e0ecff;
}
.secondary-amount {
  font-size: 25px;
}
.amount-label {
  font-size: 11px;
  color: #dceaff;
  margin-top: 5px;
}
.amount-foot {
  border-top: 1px solid #ffffff30;
  padding-top: 13px;
  font-size: 10px;
  line-height: 1.9;
  color: #e0ebff;
}
.benefit-section {
  margin-top: 28px;
  scroll-margin-top: 60px;
}
.section-title {
  font-size: 20px;
}
.section-note {
  font-size: 10px;
  line-height: 1.8;
  color: #8a9bb4;
  margin: 6px 0 12px;
}
.policy-list {
  background: #fff;
  border-radius: 16px;
  padding: 0 17px;
}
.policy-point {
  display: flex;
  gap: 12px;
  padding: 18px 0;
  border-bottom: 1px solid #f0f3f8;
}
.policy-point:last-child {
  border-bottom: 0;
}
.point-index {
  width: 22px;
  height: 22px;
  line-height: 22px;
  text-align: center;
  flex-shrink: 0;
  border-radius: 50%;
  font-size: 11px;
  color: #2b74ea;
  background: #eaf2ff;
}
.point-title {
  font-size: 14px;
  font-weight: 600;
  color: #273750;
}
.point-text {
  font-size: 12px;
  color: #7d8ca3;
  line-height: 1.9;
  margin-top: 6px;
}
.source-panel {
  border: 1px solid #dce8fc;
  background: #f0f5ff;
  border-radius: 14px;
  padding: 17px;
  margin-top: 14px;
}
.source-heading {
  font-size: 14px;
  font-weight: 600;
  color: #3d69ac;
}
.source-hint {
  font-size: 10px;
  color: #92a2bc;
  margin-top: 5px;
}
.source-link {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  text-align: left;
  font-size: 12px;
  line-height: 1.7;
  color: #41669d;
  padding: 14px 0 10px;
  border-bottom: 1px solid #e0e9f8;
}
.source-link:last-child {
  border-bottom: 0;
}
.source-link > view {
  flex: 1;
}
.source-link view > text {
  font-size: 9px;
  color: #8c9bb3;
}
.source-arrow {
  font-size: 20px;
}
.feed {
  background: #fff;
  border-radius: 16px;
  padding: 0 16px;
}
.more-news {
  color: #3677d8;
  font-size: 12px;
  padding: 17px;
}
.related-tools {
  margin-top: 14px;
  background: #fff;
  border-radius: 16px;
  padding: 0 16px;
}
.related-tool {
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 19px 0;
  text-align: left;
  width: 100%;
  border-bottom: 1px solid #edf1f8;
}
.related-tool:last-child {
  border-bottom: 0;
}
.related-tool .tool-copy {
  flex: 1;
}
.related-tool > text {
  font-size: 24px;
  color: #92abd0;
}
.tool-title {
  font-size: 14px;
  font-weight: 600;
}
.tool-note {
  font-size: 11px;
  color: #8a9bb4;
  margin-top: 5px;
}
.empty-region {
  background: #fff;
  border-radius: 18px;
  padding: 28px 20px;
  text-align: center;
  color: #8a9bb4;
  line-height: 1.9;
  font-size: 12px;
}
.empty-region .blue-icon {
  margin: auto;
}
.empty-region-title {
  font-size: 18px;
  font-weight: 600;
  color: #29466f;
  margin: 14px 0 7px;
}
.empty-region .primary {
  margin-top: 20px;
}
.policy-state {
  margin-bottom: 16px;
}
#policy-data {
  scroll-margin-top: 60px;
}
</style>
