<script setup lang="ts">
import { ref, computed, nextTick } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { insuranceRouteIds, type InsuranceRouteId } from "@uh/contracts";
import { useInsurance, money } from "../state";
import { go } from "../../services/navigation";
import Sources from "../components/Sources.vue";
import ListState from "../../components/ListState.vue";
import BlueIcon from "../../components/BlueIcon.vue";
const s = useInsurance(),
  { policy, loading, error, cityName } = s,
  route = ref<InsuranceRouteId>("benefit-medical");
onLoad((q) => {
  if (insuranceRouteIds.includes(q?.route as InsuranceRouteId))
    route.value = q!.route as InsuranceRouteId;
});
const path = computed(() =>
  policy.value?.paths.find((p) => p.id === route.value),
);
const quote = computed(() => s.quote(route.value));
const showSources = ref(false);
function official() {
  showSources.value = true;
  nextTick(() =>
    uni.pageScrollTo({ selector: "#insurance-sources", duration: 200 }),
  );
}
</script>
<template>
  <view class="ins-page ins-with-footer"
    ><ListState
      :loading="loading"
      :error="error"
      :empty="false"
      @retry="s.load"
    /><template v-if="policy && path"
      ><view class="ins-hero"
        ><view class="ins-row"
          ><text class="ins-badge">{{ cityName }} · 常见路径</text
          ><BlueIcon name="insurance" tone="blue" :size="38" /></view
        ><view class="ins-h1" style="font-size: 26px">{{ path.title }}</view
        ><view class="ins-sub">{{ path.subtitle }}</view></view
      ><view class="ins-body"
        ><view class="ins-card"
          ><view class="ins-h3">A. 先确认是否适合你</view
          ><view v-for="item in path.conditions" :key="item" class="ins-step"
            ><text class="ins-check">✓</text><text>{{ item }}</text></view
          ></view
        ><view class="ins-card"
          ><view class="ins-h3">B. 医保、养老分别怎么交</view
          ><view class="coverage"
            ><BlueIcon name="insurance" tone="green" :size="38" /><view
              ><view class="ins-h3">医疗保险</view
              ><view class="ins-caption">{{ path.medical }}</view></view
            ></view
          ><view class="coverage"
            ><BlueIcon name="budget" tone="orange" :size="38" /><view
              ><view class="ins-h3">养老保险</view
              ><view class="ins-caption">{{ path.pension }}</view></view
            ></view
          ></view
        ><view class="ins-card"
          ><view class="ins-row"
            ><view class="ins-h3">C. 条件成立时的费用参考</view
            ><text class="ins-badge">个人承担</text></view
          ><template v-if="quote"
            ><view class="ins-caption">{{
              route === "resident"
                ? policy.resident.year + "年 · " + policy.resident.ageLabel
                : "按最低缴费基数 " + money(policy.base.minCents) + " 元/月"
            }}</view
            ><view v-if="quote.unit === '月'" class="cost-lines"
              ><view class="ins-row"
                ><text>养老保险</text
                ><text>{{ money(quote.pensionCents || 0) }} 元 / 月</text></view
              ><view class="ins-row"
                ><text>医疗保险</text
                ><text>{{ money(quote.medicalCents) }} 元 / 月</text></view
              ></view
            ><view class="total ins-row"
              ><text>{{ quote.unit === "年" ? "医保年费" : "合计" }}</text
              ><view class="ins-number"
                >{{ money(quote.totalCents)
                }}<text class="ins-unit">元 / {{ quote.unit }}</text></view
              ></view
            ><view class="ins-note">{{
              route === "resident"
                ? "仅居民医保，不含居民养老。"
                : "费用未扣除可能适用的补贴。"
            }}</view></template
          ><view v-else class="ins-note">{{
            route === "employed"
              ? "由单位依法办理，具体个人份额按工资、基数等核定。"
              : "最新费用暂不可用，请查看官方政策。"
          }}</view
          ><button class="ins-link" @tap="go(s.link('fees'))">
            调整基数 / 看费用差异 ›
          </button></view
        ><view class="ins-card"
          ><view class="ins-h3">D. 按这个顺序办理</view
          ><view
            v-for="(item, index) in path.steps"
            :key="item"
            class="ins-step"
            ><text class="ins-step-num">{{ index + 1 }}</text
            ><text>{{ item }}</text></view
          ></view
        ><view class="ins-warn">{{
          route === "flexible" || route === "resident"
            ? policy.rules.waiting
            : "先核对实际参保与待遇状态；领金结束或重新就业时，及时办理状态变更，避免保障空档和重复参保。"
        }}</view
        ><view v-if="route === 'benefit-pension'" class="ins-card"
          ><view class="ins-h3">临近退休，可能有专项支持</view
          ><view class="ins-caption">{{ policy.rules.retirement }}</view></view
        ><view id="insurance-sources"
          ><Sources
            v-if="showSources"
            :policy="policy"
            :ids="path.sourceIds" /></view
        ><button
          v-if="!showSources"
          class="ins-link"
          style="margin-top: 18px"
          @tap="official"
        >
          展开官方原文与办理依据 ↗
        </button></view
      ></template
    ><view v-if="path" class="ins-fixed"
      ><button class="ins-primary" @tap="official">
        查看官方依据与办理渠道 ↗
      </button></view
    ></view
  >
</template>
<style lang="scss">
@use "../insurance.scss";
</style>
<style scoped>
.coverage {
  display: flex;
  gap: 13px;
  align-items: flex-start;
  margin-top: 22px;
}
.coverage .ins-caption {
  font-size: 13px;
}
.cost-lines {
  font-size: 14px;
  color: #536b8b;
  margin: 20px 0;
}
.cost-lines > view {
  margin-top: 16px;
}
.total {
  border-radius: 13px;
  background: #edf4ff;
  padding: 15px 12px;
  color: #3467b0;
  font-size: 14px;
}
.total .ins-number {
  font-size: 26px;
}
</style>
