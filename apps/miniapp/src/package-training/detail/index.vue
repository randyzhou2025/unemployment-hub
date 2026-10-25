<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { onLoad, onShareAppMessage } from "@dcloudio/uni-app";
import {
  trainingGradeLabels,
  registrationLabels,
  type TrainingGrade,
} from "@uh/contracts";
import { trainingReference } from "@uh/tool-core";
import ListState from "../../components/ListState.vue";
import { go } from "../../services/navigation";
import Sources from "../components/Sources.vue";
import { useTraining, trainingLink, money } from "../state";
const s = useTraining(),
  { catalog, loading, error, current } = s;
const id = ref(""),
  selectedLevel = ref<TrainingGrade>("l4"),
  selectedContext = ref("standard");
onLoad((q) => {
  id.value = String(q?.id || "");
});
const project = computed(() =>
  catalog.value?.projects.find((p) => p.id === id.value),
);
watch(
  project,
  (p) => {
    if (p && !p.levels.some((l) => l.key === selectedLevel.value))
      selectedLevel.value = p.referenceLevel;
  },
  { immediate: true },
);
watch(catalog, (c) => {
  if (c && !c.contexts.some((v) => v.id === selectedContext.value))
    selectedContext.value = c.contexts[0].id;
});
const level = computed(() =>
  project.value?.levels.find((l) => l.key === selectedLevel.value),
);
const context = computed(() =>
  catalog.value?.contexts.find((c) => c.id === selectedContext.value),
);
const amount = computed(() =>
  catalog.value && project.value
    ? trainingReference(
        catalog.value,
        project.value,
        selectedLevel.value,
        selectedContext.value,
      )
    : null,
);
function copyRegistration() {
  const source = catalog.value?.sources.find(
    (v) => v.id === project.value?.registrationSourceId,
  );
  if (source) uni.setClipboardData({ data: source.url });
}
onShareAppMessage(() => ({
  title: `${project.value?.title || "培训补贴"}｜补贴、费用与报名参考`,
  path: trainingLink("detail", id.value),
}));
</script>
<template>
  <view class="tr-page detail-page">
    <ListState
      :loading="loading && !catalog"
      :error="error"
      :empty="false"
      @retry="s.load"
    />
    <template v-if="catalog && project && level">
      <view class="tr-hero detail-hero"
        ><view class="tr-topline"
          ><text>上海 · {{ catalog.year }} 年目录</text
          ><text class="tr-location"
            >{{ project.subsidyClass }} 类支持项目</text
          ></view
        ><view class="tr-h1 detail-title">{{ project.title }}</view
        ><view v-if="project.fullName !== project.title" class="tr-caption">{{
          project.fullName
        }}</view
        ><view class="tr-sub">{{ project.summary }}</view></view
      >
      <view class="tr-body">
        <view class="tr-card reference-card"
          ><view class="tr-row"
            ><view class="tr-h3">选等级，看市级参考</view
            ><text class="reference-index">01</text></view
          ><view class="tr-caption"
            >不同等级的条件、费用与报名方式会一起更新</view
          >
          <view class="grade-options"
            ><button
              v-for="l in project.levels"
              :key="l.key"
              class="tr-pill"
              :class="{ 'is-active': selectedLevel === l.key }"
              @tap="selectedLevel = l.key"
            >
              {{ trainingGradeLabels[l.key] }}
            </button></view
          >
          <view class="tr-divider" /><view class="tr-h3 small-heading"
            >再对照政策身份条件</view
          >
          <view class="context-options"
            ><button
              v-for="c in catalog.contexts"
              :key="c.id"
              class="context-option"
              :class="{ 'is-active': selectedContext === c.id }"
              @tap="selectedContext = c.id"
            >
              <text>{{ c.label }}</text
              ><text class="context-dot">{{
                selectedContext === c.id ? "●" : "○"
              }}</text>
            </button></view
          >
          <view class="amount-panel"
            ><view class="amount-description"
              >{{ context?.label }} ·
              {{ trainingGradeLabels[selectedLevel] }}</view
            ><view v-if="amount !== null" class="tr-number amount-number"
              >{{ money(amount) }}<text class="tr-unit">元 / 次</text></view
            ><view v-else class="tr-h3 amount-pending">{{
              current ? "先确认适用条件" : "最新标准暂不可用"
            }}</view
            ><view v-if="selectedContext !== 'standard'" class="tr-caption">{{
              context?.note
            }}</view></view
          >
          <view class="tr-note">市级补贴参考，不含工会及区级资助。</view>
        </view>
        <view class="tr-card"
          ><view class="tr-row"
            ><view class="tr-h3">报名与费用</view
            ><text class="reference-index">02</text></view
          ><view class="tr-tags"
            ><text class="tr-tag blue">{{
              registrationLabels[level.registrationMode]
            }}</text
            ><text class="tr-tag gray">{{
              trainingGradeLabels[selectedLevel]
            }}</text></view
          ><view class="tr-sub">{{ level.registrationNote }}</view
          ><view class="fee-block"
            ><view class="tr-caption">所列机构评价费 · 年度公告参考</view
            ><view v-if="level.feeCents !== null" class="fee-amount"
              >{{ money(level.feeCents) }}<text class="tr-unit">元</text></view
            ><view v-else class="tr-h3">按方向或当期公告确认</view
            ><view class="tr-caption">{{ level.feeNote }}</view></view
          >
        </view>
        <view class="tr-card"
          ><view class="tr-row"
            ><view class="tr-h3">先核对申报条件</view
            ><text class="reference-index">03</text></view
          ><view class="tr-sub requirement-copy">{{
            project.requirements
          }}</view></view
        >
        <view class="tr-card"
          ><view class="tr-h3">报名怎么走</view
          ><view v-for="(step, i) in project.steps" :key="i" class="tr-step"
            ><text class="tr-step-number">{{ i + 1 }}</text
            ><view class="tr-step-copy">{{ step }}</view></view
          ></view
        >
        <button class="tr-card policy-link" @tap="go(trainingLink('policy'))">
          <view
            ><view class="tr-h3">获证后，补贴怎么申领？</view
            ><view class="tr-caption">身份条件、申请期限与官方步骤</view></view
          ><text class="tr-arrow">›</text>
        </button>
        <Sources :catalog="catalog" :ids="project.sourceIds" />
      </view>
      <view class="tr-sticky-action"
        ><button class="tr-primary" @tap="copyRegistration">
          复制官方报名指引链接 ↗
        </button></view
      >
    </template>
    <view v-else-if="catalog && !loading" class="tr-body"
      ><view class="tr-empty"
        >暂时找不到该项目<button
          class="tr-secondary"
          @tap="go(trainingLink('home'))"
        >
          查看其他项目
        </button></view
      ></view
    >
  </view>
</template>
<style lang="scss">
@use "../training.scss";
</style>
<style scoped>
.detail-page {
  padding-bottom: calc(110px + env(safe-area-inset-bottom));
}
.detail-hero {
  padding-bottom: 28px;
}
.detail-title {
  font-size: 29px;
  line-height: 1.5;
}
.reference-card {
  margin-top: -8px;
  position: relative;
}
.reference-index {
  font-size: 20px;
  color: #d8e1f3;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.grade-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 18px;
}
.grade-options .tr-pill {
  white-space: normal;
  flex-basis: calc(50% - 4px);
  box-sizing: border-box;
  padding: 12px 5px;
}
.small-heading {
  font-size: 15px;
}
.context-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 14px;
}
.context-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 5px;
  border: 1px solid #eef1f6;
  background: #f6f7fa;
  border-radius: 11px;
  color: #7a8599;
  font-size: 11px;
  text-align: left;
  padding: 12px 9px;
  min-height: 44px;
  line-height: 1.6;
}
.context-option.is-active {
  border-color: #a9c5ff;
  color: #356bdd;
  background: #edf4ff;
}
.context-dot {
  font-size: 13px;
}
.amount-panel {
  background: linear-gradient(120deg, #edf4ff, #f6f3ff);
  border-radius: 16px;
  padding: 18px 16px;
  margin: 18px 0 10px;
}
.amount-description {
  font-size: 11px;
  color: #7888a6;
}
.amount-number {
  font-size: 39px;
  margin: 10px 0 12px;
}
.amount-pending {
  margin: 15px 0;
  color: #62799f;
}
.fee-block {
  background: #f7f8fb;
  border-radius: 15px;
  padding: 15px;
  margin-top: 17px;
}
.fee-amount {
  font-size: 28px;
  font-weight: 650;
  color: #4f5f78;
  margin-top: 7px;
}
.requirement-copy {
  margin-top: 15px;
}
.policy-link {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  background: #eef3ff;
}
</style>
