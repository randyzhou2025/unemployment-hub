<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue";
import { onShow } from "@dcloudio/uni-app";
import type { BenefitPolicyResult } from "@uh/contracts";
import { calculateBenefitAmount, formatMoney } from "@uh/tool-core";
import { usePreferences } from "../../stores/preferences";
import { useCatalog } from "../../stores/catalog";
import { request } from "../../services/http";
import { go } from "../../services/navigation";
import ListState from "../../components/ListState.vue";
const p = usePreferences(),
  catalog = useCatalog();
const data = ref<BenefitPolicyResult | null>(null),
  loading = ref(true),
  networkError = ref("");
const approved = ref(""),
  received = ref("0"),
  error = ref("");
const result = ref<ReturnType<typeof calculateBenefitAmount> | null>(null);
const policy = computed(() => data.value?.policy);
const enabled = computed(() =>
  catalog.available.includes("benefit-calculator"),
);
const ready = computed(
  () =>
    !loading.value &&
    !networkError.value &&
    data.value?.state === "current" &&
    enabled.value,
);
const statusMessage = computed(() => {
  if (!enabled.value) return "此工具已暂停提供服务。";
  if (!data.value?.policy) return "请选择上海，查看领取标准并试算。";
  if (data.value.state !== "current")
    return "最新标准暂不可用，请查看官方政策。";
  return "";
});
let generation = 0;
async function load() {
  const mine = ++generation;
  loading.value = true;
  networkError.value = "";
  data.value = null;
  result.value = null;
  try {
    const [response] = await Promise.all([
      request<BenefitPolicyResult>(
        "/api/v1/benefit-policy?region=" + p.value.region,
      ),
      catalog.refresh(),
    ]);
    if (mine === generation) data.value = response;
  } catch (e) {
    if (mine === generation) networkError.value = (e as Error).message;
  } finally {
    if (mine === generation) loading.value = false;
  }
}
onShow(() => void load());
watch(
  () => p.value.region,
  () => void load(),
);
watch([approved, received], () => {
  result.value = null;
  error.value = "";
});
function chooseCity() {
  uni.showActionSheet({
    itemList: ["上海", "全国通用"],
    success: (r) =>
      p.update({ region: r.tapIndex === 0 ? "310000" : "national" }),
  });
}
async function calculate() {
  if (!ready.value || !policy.value) return;
  error.value = "";
  if (
    !/^\d{1,2}$/.test(approved.value.trim()) ||
    !/^\d{1,2}$/.test(received.value.trim())
  ) {
    error.value = "请填写核定月数与已领取月数，使用整数。";
    return;
  }
  try {
    result.value = calculateBenefitAmount({
      approvedMonths: Number(approved.value),
      receivedMonths: Number(received.value),
      firstYearMonthlyCents: policy.value.firstYearMonthlyCents,
      secondYearMonthlyCents: policy.value.secondYearMonthlyCents,
    });
    uni.hideKeyboard();
    await nextTick();
    uni.pageScrollTo({ selector: "#benefit-result", duration: 200 });
  } catch (e) {
    error.value = (e as Error).message;
  }
}
function viewPolicy() {
  const pages = getCurrentPages();
  if (pages[pages.length - 2]?.route === "pages/benefits/index")
    uni.navigateBack();
  else go("/pages/benefits/index");
}
</script>
<template>
  <view class="calculator-page">
    <view class="calculator-header"
      ><view class="row"
        ><view class="calculator-title">失业金金额试算</view
        ><button class="region-button" @tap="chooseCity">
          {{ p.value.region === "310000" ? "上海" : "全国通用" }} ⌄
        </button></view
      ><view class="calculator-subtitle"
        >已有核定结果？算清还可领的分段金额。</view
      ></view
    >
    <view class="calculator-body">
      <ListState
        :loading="loading"
        :error="networkError"
        :empty="false"
        @retry="load"
      />
      <view
        v-if="!loading && !networkError && statusMessage"
        class="notice warning"
        >{{ statusMessage
        }}<button
          v-if="!policy && enabled"
          class="secondary section"
          @tap="p.update({ region: '310000' })"
        >
          查看上海标准
        </button></view
      >
      <template v-if="policy && !loading && !networkError">
        <view class="rates-card"
          ><view class="rates-top"><text>本次采用的上海标准</text></view
          ><view class="rates-row"
            ><view
              ><view class="rate-number"
                >{{ formatMoney(policy.firstYearMonthlyCents)
                }}<text>元/月</text></view
              ><view class="rate-label">第 1–12 个月</view></view
            ><view
              ><view class="rate-number"
                >{{ formatMoney(policy.secondYearMonthlyCents)
                }}<text>元/月</text></view
              ><view class="rate-label">第 13–24 个月</view></view
            ></view
          ></view
        >
        <view class="input-card"
          ><view class="field"
            ><view class="input-label"
              >官方已核定领取月数 <text>个月</text></view
            ><input
              v-model="approved"
              class="month-input"
              type="number"
              maxlength="2"
              placeholder="请输入核定的 1–24 个月"
            /><view class="input-hint"
              >查看官方核定结果，填写该次完整的核定月数。</view
            ></view
          ><view class="field"
            ><view class="input-label">该次已领取月数 <text>个月</text></view
            ><input
              v-model="received"
              class="month-input"
              type="number"
              maxlength="2"
              placeholder="尚未领取填 0"
            /><view class="input-hint"
              >填写已实际领取的月数，不要填写剩余月数。</view
            ></view
          ></view
        >
        <view v-if="error" class="notice warning input-error">{{ error }}</view>
        <button
          class="primary calculate-button"
          :disabled="!ready"
          @tap="calculate"
        >
          试算剩余金额
        </button>
        <view class="calculation-note"
          >按本次核定期限计算，不含延长待遇或跨次合并。</view
        >
        <view v-if="result" id="benefit-result" class="estimate-card"
          ><view class="estimate-heading">按当前标准，剩余金额合计</view
          ><view class="estimate-total"
            ><text class="currency">¥</text
            >{{ formatMoney(result.totalCents) }}</view
          ><view class="estimate-months">{{
            result.remainingMonths
              ? "还有 " + result.remainingMonths + " 个月未领"
              : "按输入的月数，该次核定期限已领完"
          }}</view
          ><view class="breakdown"
            ><view class="breakdown-title">分段计算明细</view
            ><view v-if="result.firstPeriodMonths" class="breakdown-row"
              ><view
                ><view
                  >第 {{ Number(received) + 1 }}–{{
                    Math.min(Number(approved), 12)
                  }}
                  个月</view
                ><text
                  >{{ result.firstPeriodMonths }} 个月 ×
                  {{ formatMoney(policy.firstYearMonthlyCents) }} 元</text
                ></view
              ><text>¥{{ formatMoney(result.firstPeriodCents) }}</text></view
            ><view v-if="result.secondPeriodMonths" class="breakdown-row"
              ><view
                ><view
                  >第 {{ Math.max(Number(received) + 1, 13) }}–{{
                    approved
                  }}
                  个月</view
                ><text
                  >{{ result.secondPeriodMonths }} 个月 ×
                  {{ formatMoney(policy.secondYearMonthlyCents) }} 元</text
                ></view
              ><text>¥{{ formatMoney(result.secondPeriodCents) }}</text></view
            ><view v-if="!result.remainingMonths" class="input-hint"
              >没有待计算的剩余月份。</view
            ></view
          ><view class="result-note"
            >按当前标准估算，实际发放以官方核定为准。</view
          ></view
        >
      </template>
      <button class="policy-button" @tap="viewPolicy">
        查看政策标准与官方原文 ↗
      </button>
    </view>
  </view>
</template>
<style scoped>
.calculator-page {
  max-width: 560px;
  margin: auto;
  min-height: 100vh;
  background: #f5f7fc;
}
.calculator-header {
  padding: 26px 22px;
  background: linear-gradient(125deg, #e2edff, #f2f7ff);
}
.calculator-title {
  font-size: 23px;
  font-weight: 650;
  color: #183968;
}
.calculator-subtitle {
  font-size: 12px;
  color: #8497b1;
  margin-top: 10px;
}
.region-button {
  font-size: 12px;
  color: #4d74a5;
  background: #ffffffd9;
  border-radius: 20px;
  padding: 8px 12px;
  margin: 0;
  white-space: nowrap;
}
.calculator-body {
  padding: 20px 18px 30px;
}
.rates-card {
  background: linear-gradient(125deg, #2865dd, #3b80ff);
  color: #fff;
  border-radius: 16px;
  padding: 18px;
  margin-bottom: 18px;
}
.rates-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  font-size: 12px;
}
.rates-top > text:last-child {
  font-size: 9px;
  color: #d9e7ff;
}
.rates-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
  margin-top: 18px;
}
.rate-number {
  font-size: 26px;
  font-weight: 650;
  white-space: nowrap;
}
.rate-number text {
  font-size: 10px;
  font-weight: 400;
  margin-left: 4px;
}
.rate-label {
  font-size: 11px;
  color: #d9e7ff;
  margin-top: 4px;
}
.input-card {
  background: #fff;
  border: 1px solid #e8eef8;
  border-radius: 16px;
  padding: 2px 18px;
}
.field {
  padding: 20px 0;
}
.field + .field {
  border-top: 1px solid #eef2f8;
}
.input-label {
  font-size: 14px;
  font-weight: 600;
  display: flex;
  justify-content: space-between;
}
.input-label text {
  font-size: 11px;
  font-weight: 400;
  color: #96a5bb;
}
.month-input {
  background: #f5f8fe;
  border: 1px solid #e8eef8;
  border-radius: 10px;
  height: 48px;
  padding: 0 12px;
  font-size: 16px;
  margin-top: 12px;
}
.input-hint {
  font-size: 10px;
  line-height: 1.8;
  color: #96a4ba;
  margin-top: 8px;
}
.calculate-button {
  width: 100%;
  margin-top: 20px;
}
.calculation-note {
  font-size: 10px;
  line-height: 1.9;
  color: #93a2b8;
  margin-top: 12px;
}
.input-error {
  margin-top: 14px;
}
.estimate-card {
  border: 1px solid #dce8fb;
  background: linear-gradient(150deg, #e8f1ff, #fff 65%);
  border-radius: 18px;
  padding: 22px 20px;
  margin-top: 24px;
  scroll-margin-top: 20px;
}
.estimate-heading {
  font-size: 12px;
  color: #6584af;
}
.estimate-total {
  font-size: 40px;
  font-weight: 650;
  color: #1f5ecb;
  margin-top: 10px;
  letter-spacing: -1px;
}
.currency {
  font-size: 22px;
  margin-right: 5px;
}
.estimate-months {
  font-size: 12px;
  color: #7b90b0;
  margin-top: 3px;
}
.breakdown {
  margin-top: 20px;
  padding-top: 18px;
  border-top: 1px solid #dee9f9;
}
.breakdown-title {
  font-size: 13px;
  font-weight: 600;
}
.breakdown-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 16px;
  font-size: 13px;
}
.breakdown-row view > text {
  font-size: 11px;
  color: #8b9cb7;
}
.breakdown-row > text {
  font-weight: 600;
  white-space: nowrap;
}
.result-note {
  font-size: 10px;
  line-height: 1.9;
  color: #8d9db5;
  margin-top: 20px;
}
.policy-button {
  width: 100%;
  color: #3978d6;
  font-size: 12px;
  padding: 20px 0;
  margin-top: 10px;
  background: none;
}
</style>
