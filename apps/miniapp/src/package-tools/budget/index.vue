<script setup lang="ts">
import { reactive, ref, watch, nextTick } from "vue";
import { onHide, onUnload } from "@dcloudio/uni-app";
import {
  calculateBudget,
  parseMoney,
  formatMoney,
  type BudgetInput,
} from "@uh/tool-core";
import { readLocal, saveLocal } from "../../services/storage-core";
import { storage } from "../../services/storage";
const fields = [
  {
    key: "savingsCents",
    label: "当前可用存款",
    hint: "不含无法随时使用的资产",
  },
  {
    key: "monthlyIncomeCents",
    label: "每月确定收入",
    hint: "仅计入已确认、能稳定收到的收入",
  },
  { key: "housingCents", label: "每月住房支出", hint: "房租或房贷" },
  { key: "livingCents", label: "每月日常开销", hint: "饮食、交通、通讯等" },
  {
    key: "insuranceCents",
    label: "每月保障支出",
    hint: "个人需承担的社保、医保或保险费用",
  },
  { key: "otherCents", label: "其他每月固定支出", hint: "还款、家庭支持等" },
  {
    key: "reserveCents",
    label: "希望保留的备用金",
    hint: "会先从存款中扣除，不计入可用预算",
  },
] as const;
type Draft = Record<keyof BudgetInput, string>;
const blank: Draft = {
  savingsCents: "",
  monthlyIncomeCents: "0",
  housingCents: "",
  livingCents: "",
  insuranceCents: "0",
  otherCents: "0",
  reserveCents: "0",
};
const draft = reactive<Draft>(
  readLocal(
    storage,
    "uhb:v1:budget",
    (v): v is Draft =>
      !!v &&
      typeof v === "object" &&
      fields.every(
        (f) => f.key in v && typeof (v as Draft)[f.key] === "string",
      ),
  ) || blank,
);
const saved = ref(true),
  error = ref(""),
  result = ref<ReturnType<typeof calculateBudget> | null>(null);
let timer: ReturnType<typeof setTimeout> | undefined;
function flush() {
  clearTimeout(timer);
  saved.value = saveLocal(storage, "uhb:v1:budget", { ...draft }).saved;
}
watch(draft, () => {
  result.value = null;
  clearTimeout(timer);
  timer = setTimeout(flush, 350);
});
onHide(flush);
onUnload(flush);
async function calculate() {
  error.value = "";
  const values = {} as BudgetInput;
  for (const field of fields) {
    const value = parseMoney(draft[field.key]);
    if (value === null) {
      error.value = "请检查“" + field.label + "”，填写非负金额，最多两位小数";
      return;
    }
    values[field.key] = value;
  }
  flush();
  result.value = calculateBudget(values);
  await nextTick();
  uni.pageScrollTo({ selector: "#budget-result", duration: 200 });
}
</script>
<template>
  <view class="page"
    ><text class="kicker">MAKE ROOM FOR LIFE</text
    ><view class="page-title">先看清收支，<br />再安排这段时间。</view
    ><view class="section"
      ><view v-for="field in fields" :key="field.key" class="field"
        ><view class="row"
          ><text class="label">{{ field.label }}</text
          ><text class="muted">元</text></view
        ><input
          v-model="draft[field.key]"
          class="input"
          type="digit"
          maxlength="12"
          placeholder="0.00"
          @blur="flush"
        /><view class="hint">{{ field.hint }}</view></view
      ></view
    ><view class="save-state" :class="{ error: !saved }"
      >{{ saved ? "已自动保存" : "保存失败，请检查存储空间后重试"
      }}<button v-if="!saved" class="small-button" @tap="flush">
        重试保存
      </button></view
    ><view v-if="error" class="notice warning">{{ error }}</view
    ><button class="primary section" @tap="calculate">计算我的生活预算</button
    ><view v-if="result" id="budget-result" class="result section"
      ><text class="kicker">YOUR ESTIMATE</text
      ><view v-if="result.months === null" class="result-label"
        >按当前假设，月收入覆盖支出</view
      ><template v-else
        ><view class="result-label">可用资金约能支撑</view
        ><view class="result-number"
          >{{ result.months }}<text>个月</text></view
        ></template
      ><view class="divider" /><view class="row"
        ><text class="muted">每月必要支出</text
        ><text>¥{{ formatMoney(result.expensesCents) }}</text></view
      ><view class="row"
        ><text class="muted">每月资金缺口</text
        ><text>¥{{ formatMoney(result.shortfallCents) }}</text></view
      ><view class="row"
        ><text class="muted">扣除备用金后可用</text
        ><text>¥{{ formatMoney(result.availableCents) }}</text></view
      ><view v-if="result.reserveExceedsSavings" class="notice warning section"
        >备用金超过存款，当前可支配余额按 0 计算。</view
      ><view class="hint" style="margin-top: 20px"
        >按每月收支估算。收支变化后可重新计算。</view
      ></view
    ></view
  >
</template>
<style scoped>
.result {
  background: #edf4ff;
  padding: 24px;
  border-radius: 20px;
}
.result-label {
  font-size: 15px;
  margin-top: 16px;
}
.result-number {
  font-size: 60px;
  font-weight: 500;
  letter-spacing: -2px;
  line-height: 1.5;
}
.result-number text {
  font-size: 14px;
  letter-spacing: 0;
  margin-left: 8px;
  color: #7c8aa6;
}
.result .row {
  padding: 8px 0;
  font-size: 15px;
}
</style>
