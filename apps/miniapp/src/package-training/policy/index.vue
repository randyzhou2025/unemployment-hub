<script setup lang="ts">
import { ref } from "vue";
import { onShareAppMessage } from "@dcloudio/uni-app";
import { trainingGrades, trainingGradeLabels } from "@uh/contracts";
import ListState from "../../components/ListState.vue";
import Sources from "../components/Sources.vue";
import { useTraining, trainingLink, money } from "../state";
const s = useTraining(),
  { catalog, loading, error, current } = s;
const selectedClass = ref<"A" | "B" | "C">("A"),
  expanded = ref(-1);
onShareAppMessage(() => ({
  title: "上海培训补贴｜标准与申领指南",
  path: trainingLink("policy"),
}));
</script>
<template>
  <view class="tr-page"
    ><view class="tr-hero"
      ><view class="tr-topline"
        ><text>上海 · 市级职业技能提升补贴</text
        ><text class="tr-location">申领指南</text></view
      ><view class="tr-h1">先看条件，<br />再把补贴申请明白。</view
      ><view class="tr-sub">不止看证书，还要看身份、就业与时间。</view></view
    >
    <view class="tr-body"
      ><ListState
        :loading="loading && !catalog"
        :error="error"
        :empty="false"
        @retry="s.load"
      />
      <template v-if="catalog"
        ><view v-if="!current" class="tr-warn"
          >最新补贴标准暂不可用，请查看官方政策。</view
        >
        <view class="tr-card"
          ><view class="tr-h3">A / B / C 类，标准有区别</view
          ><view class="tr-caption"
            >{{ catalog.year }}年目录 · 按职业类别与等级对照</view
          ><view class="class-tabs"
            ><button
              v-for="c in ['A', 'B', 'C'] as const"
              :key="c"
              class="tr-pill"
              :class="{ 'is-active': selectedClass === c }"
              @tap="selectedClass = c"
            >
              {{ c }} 类
            </button></view
          ><view class="standard-grid"
            ><view v-for="g in trainingGrades" :key="g" class="standard-cell"
              ><view class="tr-caption">{{ trainingGradeLabels[g] }}</view
              ><view class="standard-number"
                >{{
                  current ? money(catalog.rates[selectedClass][g]) : "暂不可用"
                }}<text v-if="current" class="tr-unit">元</text></view
              ></view
            ></view
          ><view class="tr-note"
            >各职业开放等级以项目说明为准；补贴按个人条件核定。</view
          ></view
        >
        <view class="tr-h2">哪些条件，值得先确认？</view>
        <view class="tr-card policy-questions"
          ><view
            v-for="(item, i) in catalog.policyItems"
            :key="i"
            class="policy-item"
            ><button
              class="policy-question"
              @tap="expanded = expanded === i ? -1 : i"
            >
              <view class="question-title"
                ><text class="question-number">{{
                  String(i + 1).padStart(2, "0")
                }}</text
                ><text>{{ item.title }}</text></view
              ><text class="tr-arrow">{{
                expanded === i ? "−" : "＋"
              }}</text></button
            ><view v-if="expanded === i" class="policy-answer">{{
              item.text
            }}</view></view
          ></view
        >
        <view class="tr-h2">准备好了，按这几步申请</view
        ><view class="tr-card"
          ><view
            v-for="(step, i) in catalog.applicationSteps"
            :key="i"
            class="tr-step"
            ><text class="tr-step-number">{{ i + 1 }}</text
            ><view class="tr-step-copy">{{ step }}</view></view
          ></view
        >
        <view class="tr-card reminder"
          ><view class="tr-h3">报名费、培训费，先问清</view
          ><view class="tr-sub"
            >评价机构的考核费用与培训课程费用分开收取。不要把“能申请补贴”理解为免费考证，也不要为保证通过、保证领补贴的承诺付款。</view
          ></view
        >
        <Sources :catalog="catalog" :ids="catalog.policySourceIds" /><view
          class="tr-note"
          >目录自 {{ catalog.effectiveFrom }} 起实施</view
        >
      </template>
    </view>
  </view>
</template>
<style lang="scss">
@use "../training.scss";
</style>
<style scoped>
.class-tabs {
  display: flex;
  gap: 8px;
  margin-top: 18px;
}
.class-tabs .tr-pill {
  flex: 1;
}
.standard-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin: 16px 0;
}
.standard-cell {
  background: #f7f8fb;
  padding: 14px;
  border-radius: 13px;
}
.standard-number {
  font-size: 25px;
  letter-spacing: -0.6px;
  font-weight: 650;
  color: #5275ba;
  margin-top: 4px;
  font-variant-numeric: tabular-nums;
}
.policy-questions {
  padding: 2px 18px;
}
.policy-question {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 17px 0;
  line-height: 1.8;
  text-align: left;
  background: none;
}
.question-title {
  display: flex;
  gap: 9px;
  font-size: 14px;
  color: #43526d;
  align-items: flex-start;
}
.question-number {
  font-size: 11px;
  color: #9caac2;
  line-height: 25px;
  flex-shrink: 0;
}
.policy-item {
  border-bottom: 1px solid #f0f2f7;
}
.policy-answer {
  font-size: 13px;
  color: #7b879d;
  line-height: 1.9;
  padding: 0 0 19px 25px;
}
.reminder {
  background: #edf2ff;
  border-color: #e1eaff;
}
.reminder .tr-sub {
  margin-top: 10px;
}
</style>
