<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { insuranceQuote, insuranceAccount } from "@uh/tool-core";
import { useInsurance, money } from "../state";
import Sources from "../components/Sources.vue";
import ListState from "../../components/ListState.vue";
const s = useInsurance(),
  { policy, loading, error, cityName } = s;
const mode = ref("min"),
  raw = ref("");
watch(s.cityId, () => {
  raw.value = "";
  mode.value = "min";
});
const base = computed(() =>
  mode.value === "min"
    ? policy.value?.base.minCents || 0
    : /^\d+(\.\d{1,2})?$/.test(raw.value.trim())
      ? Math.round(Number(raw.value) * 100)
      : NaN,
);
const baseError = computed(() =>
  policy.value &&
  (!Number.isSafeInteger(base.value) ||
    base.value < policy.value.base.minCents ||
    base.value > policy.value.base.maxCents)
    ? `请输入 ${money(policy.value.base.minCents)}–${money(policy.value.base.maxCents)} 元之间的基数，最多两位小数`
    : "",
);
const quotes = computed(
  () =>
    policy.value?.paths.map((path) => ({
      path,
      quote:
        baseError.value && ["benefit-pension", "flexible"].includes(path.id)
          ? null
          : insuranceQuote(policy.value!, path.id, base.value),
    })) || [],
);
const account = computed(() =>
  policy.value && !baseError.value
    ? insuranceAccount(policy.value, base.value)
    : null,
);
function pct(n: number) {
  return n / 100 + "%";
}
</script>
<template>
  <view class="ins-page"
    ><view class="ins-hero"
      ><view class="ins-row"
        ><text class="ins-label">费用与差异</text
        ><button class="ins-city" @tap="s.chooseCity">
          ⌖ {{ cityName }}⌄
        </button></view
      ><view class="ins-h1"
        ><view>每笔费用，</view><view>都看得明明白白。</view></view
      ><view class="ins-sub">按月与按年分开看，也别忽略保障差异。</view></view
    ><view class="ins-body"
      ><ListState
        :loading="loading"
        :error="error"
        :empty="false"
        @retry="s.load" /><template v-if="policy"
        ><view class="ins-card"
          ><view class="ins-h3">选择职工保险缴费基数</view
          ><view class="ins-options"
            ><button
              class="ins-option"
              :class="{ 'is-selected': mode === 'min' }"
              @tap="mode = 'min'"
            >
              最低基数 {{ money(policy.base.minCents) }} 元</button
            ><button
              class="ins-option"
              :class="{ 'is-selected': mode === 'custom' }"
              @tap="mode = 'custom'"
            >
              自选基数
            </button></view
          ><input
            v-if="mode === 'custom'"
            v-model="raw"
            class="ins-input"
            type="digit"
            maxlength="12"
            placeholder="输入月缴费基数（元）"
            :adjust-position="true"
          /><view v-if="baseError" class="ins-warn">{{ baseError }}</view
          ><view class="ins-caption"
            >基数从 {{ policy.base.from }} 起执行；养老
            {{ pct(policy.pension.bps) }}，医保
            {{ pct(policy.medical.bps) }}。</view
          ><view class="ins-caption"
            >医保费率有效期 {{ policy.medical.from }} 至
            {{ policy.medical.to || "以新公告为准" }}。</view
          ></view
        >
        <view class="ins-h2">常见路径 · 个人承担费用</view
        ><view v-for="{ path, quote } in quotes" :key="path.id" class="ins-card"
          ><view class="ins-h3">{{ path.title }}</view
          ><view class="ins-caption">{{ path.subtitle }}</view
          ><view v-if="quote" class="ins-number" style="margin-top: 13px"
            >{{ money(quote.totalCents)
            }}<text class="ins-unit">元 / {{ quote.unit }}</text></view
          ><view v-else class="ins-note">{{
            path.id === "employed"
              ? "单位依法办理，金额按工资等另行核定"
              : baseError
                ? "请先输入有效基数"
                : "最新费用暂不可用，请查看官方政策"
          }}</view
          ><view
            v-if="quote && quote.unit === '月' && path.id !== 'benefit-medical'"
            class="ins-caption"
            >养老 {{ money(quote.pensionCents || 0) }} ＋ 医保
            {{ money(quote.medicalCents) }} 元 / 月</view
          ><view v-if="path.id === 'resident'" class="ins-caption"
            >{{ policy.resident.year }}年 · {{ policy.resident.ageLabel }} ·
            仅居民医保，不含养老。</view
          ></view
        >
        <view class="ins-h2">医保费，都进个人账户吗？</view
        ><view class="ins-card"
          ><text class="ins-badge">职工医保 · 比例示意</text
          ><template v-if="account"
            ><view class="ins-caption" style="margin-top: 16px"
              >以所选基数计算的月医保缴费</view
            ><view class="ins-number"
              >{{ money(account.medical)
              }}<text class="ins-unit">元 / 月</text></view
            ><view class="account-bar"
              ><view
                :style="{
                  width:
                    (policy.medical.bps
                      ? (policy.account.bps / policy.medical.bps) * 100
                      : 0) + '%',
                }" /></view
            ><view class="ins-split"
              ><view class="ins-split-cell"
                ><view class="account-personal"
                  >{{ money(account.personal) }} 元</view
                ><view class="ins-caption"
                  >个人账户月度理论对应 · 基数 ×
                  {{ pct(policy.account.bps) }}</view
                ></view
              ><view class="ins-split-cell"
                ><view class="account-other">{{ money(account.other) }} 元</view
                ><view class="ins-caption"
                  >其余医保筹资 · 用于共同保障</view
                ></view
              ></view
            ><view class="ins-divider" /><view class="ins-caption"
              >若该基数持续完整12个月，个人账户理论合计
              {{ money(account.annualPersonal) }}
              元。实际按医保年度参保情况预计入、清算，并非每月固定到账。</view
            ></template
          ><view v-else class="ins-note"
            >暂无法计算，请检查缴费基数或查看最新政策。</view
          ><view class="ins-note">{{ policy.rules.account }}</view></view
        ><view class="ins-warn">{{ policy.rules.waiting }}</view
        ><Sources :policy="policy" /></template></view
  ></view>
</template>
<style lang="scss">
@use "../insurance.scss";
</style>
<style scoped>
.account-bar {
  margin: 20px 0 18px;
  border-radius: 6px;
  height: 7px;
  background: #bcd6ff;
  overflow: hidden;
}
.account-bar > view {
  height: 100%;
  background: #ff9c64;
}
.account-personal,
.account-other {
  font-weight: 650;
  font-size: 20px;
  letter-spacing: -0.5px;
}
.account-personal {
  color: #e48b52;
}
.account-other {
  color: #2874ff;
}
</style>
