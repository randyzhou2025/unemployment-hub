<script setup lang="ts">
import { ref, reactive, computed, watch } from "vue";
import { recommendInsurance } from "@uh/tool-core";
import type { InsuranceAnswers } from "@uh/tool-core";
import { useInsurance, money, readAnswers, saveAnswers } from "../state";
import { go } from "../../services/navigation";
import ListState from "../../components/ListState.vue";
const s = useInsurance(),
  { policy, loading, error, cityName } = s;
const step = ref(0),
  a = reactive(readAnswers(s.cityId.value));
watch(s.cityId, (id) => {
  Object.assign(a, readAnswers(id));
  step.value = 0;
});
const statuses = [
  { key: "receiving", label: "正在领失业金", sub: "已经核定并在领取" },
  { key: "pending", label: "申领中 / 待审核", sub: "尚未确认开始发放" },
  { key: "unemployed", label: "失业，暂未领金", sub: "当前没有单位参保" },
  { key: "exhausted", label: "失业金已领完", sub: "准备衔接个人保障" },
  { key: "flexible", label: "实际从事灵活就业", sub: "自雇、非全日制等" },
  { key: "employed", label: "已重新就业", sub: "由新单位办理社保" },
  { key: "unknown", label: "还不确定", sub: "先帮我理清楚" },
];
const groups = computed(() =>
  [
    {
      key: "residence",
      title: "户籍与居住情况",
      hint: "参保条件与户籍、居住身份有关",
      options: [
        { key: "local", label: cityName.value + "户籍" },
        { key: "nonlocal", label: "外地户籍" },
        { key: "permit", label: "外地户籍，有居住证" },
        { key: "unknown", label: "暂不确定" },
      ],
    },
    {
      key: "medical",
      title: "当前医保情况",
      hint: "医保缴费成功和待遇可用，并不完全相同",
      options: [
        { key: "employee", label: "职工医保待遇正常" },
        { key: "resident", label: "居民医保待遇正常" },
        { key: "interrupted", label: "已断缴 / 已停保" },
        { key: "unknown", label: "还没查过" },
      ],
    },
    {
      key: "pension",
      title: "养老保险怎么安排？",
      hint: "已缴年限会保留，暂停月份不新增年限",
      options: [
        { key: "continue", label: "希望继续缴" },
        { key: "pause", label: "暂时缓一缓" },
        { key: "compare", label: "先比较再决定" },
      ],
    },
  ].filter((group) => !(a.status === "receiving" && group.key === "residence")),
);
function pick(key: string, value: string) {
  if (
    (key === "status" && value !== a.status) ||
    (key === "residence" && value !== a.residence)
  )
    a.eligibility = "unknown";
  Object.assign(a, { [key]: value });
}
const result = computed(() =>
  policy.value ? recommendInsurance(policy.value, a) : null,
);
const paths = computed(
  () =>
    policy.value?.paths.filter((p) => result.value?.routes.includes(p.id)) ||
    [],
);
function advance() {
  saveAnswers(a);
  step.value = step.value === 0 && a.status === "employed" ? 2 : step.value + 1;
  uni.pageScrollTo({ scrollTop: 0, duration: 180 });
}
function previous() {
  step.value = step.value === 2 && a.status === "employed" ? 0 : step.value - 1;
  uni.pageScrollTo({ scrollTop: 0, duration: 180 });
}
function detail(route: (typeof paths.value)[number]["id"]) {
  saveAnswers(a);
  go(s.link("detail", route));
}
</script>
<template>
  <view class="ins-page ins-with-footer"
    ><view class="ins-body"
      ><view class="ins-row" style="padding-top: 18px"
        ><view class="ins-h3">我的参保方案</view
        ><button class="ins-city" @tap="s.chooseCity">
          ⌖ {{ cityName }}⌄
        </button></view
      ><view class="ins-progress"
        ><view
          v-for="(label, index) in ['选择情况', '保障安排', '方案建议']"
          :key="label"
          class="ins-progress-item"
          :class="{ active: step >= index }"
          ><text class="ins-progress-number">{{ index + 1 }}</text
          >{{ label }}</view
        ></view
      ><ListState
        :loading="loading"
        :error="error"
        :empty="false"
        @retry="s.load"
      />
      <template v-if="policy"
        ><template v-if="step === 0"
          ><view class="ins-h2">先了解你的当前情况</view
          ><view class="ins-sub">选择最接近的一项，之后随时可以修改。</view
          ><view class="ins-card"
            ><view class="ins-h3">当前状态</view
            ><view class="ins-options"
              ><button
                v-for="option in statuses"
                :key="option.key"
                class="ins-option status-option"
                :class="{ 'is-selected': a.status === option.key }"
                @tap="pick('status', option.key)"
              >
                <view>{{ option.label }}</view
                ><view class="ins-caption">{{ option.sub }}</view>
              </button></view
            ></view
          ><view v-if="a.status === 'receiving'" class="ins-card"
            ><view class="ins-h3">失业金在哪个地区领取？</view
            ><view class="ins-options"
              ><button
                v-for="o in [
                  { key: 'local', label: cityName },
                  { key: 'other', label: '其他地区' },
                  { key: 'unknown', label: '还不确定' },
                ]"
                :key="o.key"
                class="ins-option"
                :class="{ 'is-selected': a.benefitPlace === o.key }"
                @tap="pick('benefitPlace', o.key)"
              >
                {{ o.label }}
              </button></view
            ><view class="ins-note">请选择实际领取失业金的地区。</view></view
          ></template
        >
        <template v-else-if="step === 1"
          ><view class="ins-h2">把保障与预算放在一起</view
          ><view
            v-for="group in groups"
            :key="group.key"
            class="ins-card ins-form-card"
            ><view class="ins-h3">{{ group.title }}</view
            ><view class="ins-caption">{{ group.hint }}</view
            ><view class="ins-options"
              ><button
                v-for="o in group.options"
                :key="o.key"
                class="ins-option"
                :class="{
                  'is-selected':
                    a[group.key as keyof InsuranceAnswers] === o.key,
                }"
                @tap="pick(group.key, o.key)"
              >
                {{ o.label }}
              </button></view
            ></view
          >
          <view
            v-if="
              ['flexible', 'unemployed', 'pending', 'exhausted'].includes(
                a.status,
              )
            "
            class="ins-card"
            ><view class="ins-h3">{{
              a.status === "flexible"
                ? "灵活就业参保资格确认了吗？"
                : "居民医保参保资格确认了吗？"
            }}</view
            ><view class="ins-caption">{{
              a.status === "flexible"
                ? policy.rules.flexEligibility
                : policy.rules.residentEligibility
            }}</view
            ><view class="ins-options"
              ><button
                class="ins-option"
                :class="{ 'is-selected': a.eligibility === 'confirmed' }"
                @tap="a.eligibility = 'confirmed'"
              >
                已向经办机构确认</button
              ><button
                class="ins-option"
                :class="{ 'is-selected': a.eligibility === 'unknown' }"
                @tap="a.eligibility = 'unknown'"
              >
                尚未确认
              </button></view
            ></view
          >
          <view v-if="a.status === 'receiving'" class="ins-card"
            ><view class="ins-h3">距法定退休年龄不足1年？</view
            ><view class="ins-options"
              ><button
                v-for="o in [
                  { key: 'yes', label: '是' },
                  { key: 'no', label: '否' },
                  { key: 'unknown', label: '还不确定' },
                ]"
                :key="o.key"
                class="ins-option"
                :class="{ 'is-selected': a.retirement === o.key }"
                @tap="pick('retirement', o.key)"
              >
                {{ o.label }}
              </button></view
            ></view
          ></template
        >
        <template v-else
          ><view class="ins-h2">{{ result?.heading }}</view
          ><view
            v-for="path in paths"
            :key="path.id"
            class="ins-card result-card"
            ><text class="ins-badge">{{
              paths.length > 1 ? "可比较路径" : "优先了解的路径"
            }}</text
            ><view class="ins-h3" style="margin-top: 13px">{{
              path.title
            }}</view
            ><view class="ins-caption">{{ path.subtitle }}</view
            ><view
              v-if="s.quote(path.id)"
              class="ins-number"
              style="margin-top: 16px"
              >{{ money(s.quote(path.id)!.totalCents)
              }}<text class="ins-unit"
                >元 / {{ s.quote(path.id)!.unit }} · 条件成立时参考</text
              ></view
            ><view v-else class="ins-note">{{
              path.id === "employed"
                ? "由单位按实际工资等办理"
                : "最新费用暂不可用"
            }}</view
            ><view v-if="path.id === 'resident'" class="ins-note"
              >仅{{ policy.resident.year }}年 · {{ policy.resident.ageLabel }} ·
              医保年费，不含养老</view
            ><button class="ins-primary" @tap="detail(path.id)">
              查看费用与办理步骤 →
            </button></view
          >
          <view class="ins-card"
            ><view class="ins-h3">下一步，先确认这些事</view
            ><view
              v-for="(note, index) in result?.notes"
              :key="note"
              class="ins-step"
              ><text class="ins-step-num">{{ index + 1 }}</text
              ><text>{{ note }}</text></view
            ><view v-if="!result?.notes.length" class="ins-note"
              >向新单位确认参保增员与医保待遇衔接月份。</view
            ></view
          ><button
            class="ins-secondary"
            style="width: 100%; margin-top: 16px"
            @tap="go(s.link('fees'))"
          >
            比较费用与政策差异</button
          ><view class="ins-note"
            >不同制度保障不同，不能只按最低价格选择。你可以返回修改情况，再比较方案。</view
          ></template
        ></template
      > </view
    ><view class="ins-fixed"
      ><button v-if="step > 0" class="ins-secondary" @tap="previous">
        上一步</button
      ><button
        v-if="step < 2"
        class="ins-primary"
        :disabled="!policy || loading"
        @tap="advance"
      >
        {{ step === 0 ? "下一步：安排保障" : "查看我的方案" }} →</button
      ><button v-else class="ins-primary" @tap="step = 0">
        重新选择情况
      </button></view
    ></view
  >
</template>
<style lang="scss">
@use "../insurance.scss";
</style>
<style scoped>
.status-option {
  text-align: left;
  min-height: 80px;
}
.status-option .ins-caption {
  font-size: 11px;
}
.result-card {
  background: linear-gradient(130deg, #fff, #edf5ff);
  border-color: #dce9ff;
}
</style>
