<script setup lang="ts">
import { ref, computed } from "vue";
import { onPullDownRefresh, onShareAppMessage } from "@dcloudio/uni-app";
import {
  trainingCategories,
  trainingGradeLabels,
  registrationLabels,
  type TrainingProject,
} from "@uh/contracts";
import { filterTraining, trainingReference } from "@uh/tool-core";
import ListState from "../../components/ListState.vue";
import ContentCard from "../../components/ContentCard.vue";
import { go } from "../../services/navigation";
import { useContentList } from "../../services/content";
import { useTraining, trainingLink, money } from "../state";
const s = useTraining(),
  { catalog, loading, error, current } = s;
const query = ref(""),
  category = ref("all"),
  personalOnly = ref(false);
const filtered = computed(() =>
  filterTraining(
    catalog.value?.projects || [],
    query.value,
    category.value,
    personalOnly.value,
  ),
);
const list = useContentList(() => ({
  kind: "article",
  issue: "training",
  region: "310000",
}));
void list.load();
function clear() {
  query.value = "";
  category.value = "all";
  personalOnly.value = false;
}
const amount = (p: TrainingProject) =>
  catalog.value
    ? trainingReference(catalog.value, p, p.referenceLevel, "standard")
    : null;
const level = (p: TrainingProject) =>
  p.levels.find((l) => l.key === p.referenceLevel)!;
onPullDownRefresh(async () => {
  await Promise.allSettled([s.load(), list.load()]);
  uni.stopPullDownRefresh();
});
onShareAppMessage(() => ({
  title: "上海培训补贴｜选项目、看费用、查官方报名",
  path: trainingLink("home"),
}));
</script>
<template>
  <view class="tr-page training-home">
    <view class="tr-hero"
      ><view class="tr-topline"
        ><text>TRAINING · 下一步的底气</text
        ><text class="tr-location"
          >⌖ 上海 · {{ catalog?.year || 2026 }}</text
        ></view
      >
      <view class="tr-h1">学点新本领，<br />让下一步更有选择。</view
      ><view class="tr-sub">选方向、核条件，报名和费用一起看清。</view>
    </view>
    <view class="tr-body">
      <button class="tr-card claim-entry" @tap="go(trainingLink('policy'))">
        <view
          ><view class="tr-h3">已经拿到证书？</view
          ><view class="tr-caption">查看申领条件、时限与办理步骤</view></view
        ><text class="claim-arrow">↗</text>
      </button>
      <ListState
        :loading="loading && !catalog"
        :error="error"
        :empty="false"
        @retry="s.load"
      />
      <template v-if="catalog"
        ><view v-if="!current" class="tr-warn"
          >最新补贴标准暂不可用，请查看官方政策。</view
        >
        <view class="tr-h2">找到适合你的方向</view
        ><view class="tr-sub">从你的经验和下一份工作出发。</view>
        <view class="search-field"
          ><text class="search-symbol">⌕</text
          ><input
            v-model="query"
            class="search-input"
            placeholder="搜索职业、方向或关键词"
            confirm-type="search"
            maxlength="60"
          /><button
            v-if="query"
            class="search-clear"
            aria-label="清空搜索"
            @tap="query = ''"
          >
            ×
          </button></view
        >
        <scroll-view scroll-x class="category-scroll"
          ><view class="category-row"
            ><button
              class="tr-pill"
              :class="{ 'is-active': category === 'all' }"
              @tap="category = 'all'"
            >
              全部方向</button
            ><button
              v-for="c in trainingCategories"
              :key="c.id"
              class="tr-pill"
              :class="{ 'is-active': category === c.id }"
              @tap="category = c.id"
            >
              {{ c.label }}
            </button></view
          ></scroll-view
        >
        <view class="tr-row filter-summary"
          ><text class="tr-caption">{{ filtered.length }} 个参考项目</text
          ><button
            class="personal-toggle"
            :class="{ on: personalOnly }"
            @tap="personalOnly = !personalOnly"
          >
            <text>{{ personalOnly ? "✓" : "○" }}</text> 有个人申报渠道
          </button></view
        >
        <button
          v-for="p in filtered"
          :key="p.id"
          class="tr-card project-card"
          @tap="go(trainingLink('detail', p.id))"
        >
          <view class="tr-row"
            ><view class="tr-h3 project-title">{{ p.title }}</view
            ><text class="tr-arrow">›</text></view
          ><view class="tr-caption project-summary">{{ p.summary }}</view>
          <view class="tr-tags"
            ><text class="tr-tag">{{ p.subsidyClass }} 类目录</text
            ><text
              class="tr-tag"
              :class="
                level(p).registrationMode === 'personal' ? 'blue' : 'gray'
              "
              >{{ registrationLabels[level(p).registrationMode] }}</text
            ></view
          >
          <view class="project-bottom"
            ><view
              ><view class="amount-label"
                >{{ trainingGradeLabels[p.referenceLevel].split(" / ")[0] }} ·
                市级目录标准</view
              ><view v-if="amount(p) !== null" class="tr-number"
                >{{ money(amount(p)!) }}<text class="tr-unit">元</text></view
              ><view v-else class="tr-sub">金额暂不可用</view></view
            ><view class="fee-mini"
              ><view class="tr-note">所列机构评价费参考</view
              ><view class="fee-value">{{
                level(p).feeCents === null
                  ? "按方向 / 公告确认"
                  : money(level(p).feeCents!) + " 元"
              }}</view
              ><view class="tr-note">培训费另计</view></view
            ></view
          >
        </button>
        <view v-if="!filtered.length" class="tr-card tr-empty"
          >没有匹配的项目<br />试试其他关键词或方向<button
            class="tr-link reset-filters"
            @tap="clear"
          >
            清空筛选条件
          </button></view
        >
        <view class="catalog-footnote"
          >补贴按个人条件核定，报名与费用以当期公告为准。</view
        >
        <button class="tr-card policy-entry" @tap="go(trainingLink('policy'))">
          <view
            ><view class="tr-h3">补贴规则，一次看清</view
            ><view class="tr-caption"
              >A / B / C 标准 · 身份条件 · 申请步骤</view
            ></view
          ><text class="tr-arrow">→</text>
        </button>
      </template>
      <view class="tr-row"
        ><view class="tr-h2">培训补贴资讯</view
        ><button
          class="tr-link"
          @tap="go('/pages/search/index?issue=training&region=310000')"
        >
          更多 ›
        </button></view
      >
      <view class="tr-card feed"
        ><ContentCard
          v-for="item in list.items.value.slice(0, 3)"
          :key="item.id"
          :item="item" /><ListState
          :loading="list.loading.value"
          :error="list.error.value"
          :empty="!list.items.value.length"
          @retry="list.load()"
      /></view>
    </view>
  </view>
</template>
<style lang="scss">
@use "../training.scss";
</style>
<style scoped>
.claim-entry {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  margin-top: -10px;
  position: relative;
  box-shadow: 0 12px 28px #7684b10c;
}
.claim-arrow {
  background: #edf1ff;
  color: #5d7ee8;
  width: 40px;
  height: 40px;
  line-height: 40px;
  text-align: center;
  border-radius: 14px;
  font-size: 23px;
  flex-shrink: 0;
}
.search-field {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #fff;
  border: 1px solid #e9edf4;
  border-radius: 15px;
  padding: 4px 12px;
  margin: 19px 0 14px;
  height: 44px;
}
.search-symbol {
  font-size: 26px;
  color: #8b95aa;
}
.search-input {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  height: 44px;
}
.search-clear {
  width: 40px;
  line-height: 44px;
  color: #8d96aa;
  background: none;
}
.category-scroll {
  width: 100%;
  white-space: nowrap;
}
.category-row {
  display: flex;
  gap: 7px;
  padding-bottom: 4px;
}
.filter-summary {
  margin-top: 9px;
}
.personal-toggle {
  font-size: 12px;
  line-height: 44px;
  color: #8a93a6;
  display: flex;
  gap: 6px;
  background: none;
}
.personal-toggle.on {
  color: #446fe0;
}
.project-card {
  width: 100%;
  padding: 19px 18px;
  margin: 12px 0;
}
.project-title {
  font-size: 18px;
}
.project-summary {
  margin-top: 5px;
  line-height: 1.8;
  font-size: 12px;
}
.project-bottom {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  border-top: 1px solid #f1f3f7;
  padding-top: 14px;
  margin-top: 15px;
}
.amount-label {
  color: #8a92a6;
  font-size: 11px;
  margin-bottom: 6px;
}
.fee-mini {
  text-align: right;
}
.fee-value {
  font-size: 13px;
  color: #63718a;
  line-height: 1.9;
}
.catalog-footnote {
  font-size: 11px;
  color: #939bad;
  line-height: 1.9;
  padding: 5px 3px 12px;
}
.policy-entry {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  background: linear-gradient(130deg, #e9efff, #f3f0ff);
  border-color: #e7eafe;
}
.reset-filters {
  text-align: center;
  margin-top: 10px;
}
.feed {
  padding: 0 16px;
}
</style>

<style scoped>
.training-home .tr-hero {
  padding: 18px 24px 25px;
}
.training-home .tr-topline {
  margin-bottom: 10px;
}
.training-home .tr-h1 {
  font-size: 28px;
  line-height: 1.4;
  margin: 5px 0 10px;
}
.training-home .tr-h2 {
  margin-top: 21px;
}
.training-home .claim-entry {
  padding: 15px 18px;
}
.training-home .claim-entry .tr-h3 {
  font-size: 16px;
}
.training-home .claim-entry .tr-caption {
  font-size: 11px;
}
.category-row .tr-pill {
  flex-shrink: 0;
  max-width: none;
}
</style>
