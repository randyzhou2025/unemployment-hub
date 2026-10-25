<script setup lang="ts">
import { computed, watch, ref } from "vue";
import { onPullDownRefresh, onShareAppMessage } from "@dcloudio/uni-app";
import { useInsurance, money } from "../state";
import { useContentList } from "../../services/content";
import { go } from "../../services/navigation";
import BlueIcon from "../../components/BlueIcon.vue";
import ContentCard from "../../components/ContentCard.vue";
import ListState from "../../components/ListState.vue";
const s = useInsurance();
const { policy, cityName, loading, error, stale } = s;
const list = useContentList(() => ({
  region: s.cityId.value,
  issue: "insurance",
  kind: "article",
}));
watch(
  s.cityId,
  () => {
    list.items.value = [];
    void list.load();
  },
  { immediate: true },
);
onPullDownRefresh(async () => {
  await Promise.all([s.load(), list.load()]);
  uni.stopPullDownRefresh();
});
onShareAppMessage(() => ({
  title: "失业后，社保医保怎么安排？",
  path: s.link("home"),
}));
const activeFaq = ref(-1);
const faqs = computed(() =>
  policy.value
    ? [
        {
          q: "失业后，医保一定要自己缴吗？",
          a:
            policy.value.paths.find((p) => p.id === "benefit-medical")!
              .medical +
            "申请中或刚停领时，须先确认实际医保待遇，不能直接按零自付理解。",
        },
        {
          q: "养老停一段时间，过去白缴了吗？",
          a: "已有养老缴费年限不会清零，暂停月份不新增年限。是否续缴，应结合现金预算与退休安排；不能任意补缴增加年限。",
        },
        { q: "缴费之后，马上能报销吗？", a: policy.value.rules.waiting },
        {
          q: "有居住证，就能参加居民医保吗？",
          a: policy.value.rules.residentEligibility,
        },
      ]
    : [],
);
</script>
<template>
  <view class="ins-page">
    <view class="ins-hero"
      ><view class="ins-row"
        ><BlueIcon name="insurance" tone="green" :size="44" /><button
          class="ins-city"
          @tap="s.chooseCity"
        >
          ⌖ {{ cityName }}⌄
        </button></view
      ><view class="ins-h1"
        ><view>失业后，</view><view>社保医保怎么安排？</view></view
      ><view class="ins-sub">先确认谁来缴，再选适合自己的方式。</view></view
    >
    <view class="ins-body"
      ><view class="ins-card start-card"
        ><view class="ins-row"
          ><view
            ><view class="ins-h3">找到你的参保方案</view
            ><view class="ins-caption">几步选清情况，把保障安排明白</view></view
          ><text class="start-symbol">✓</text></view
        ><button class="ins-primary" @tap="go(s.link('planner'))">
          看看我该怎么缴 <text>→</text>
        </button></view
      >
      <ListState
        :loading="loading"
        :error="error"
        :empty="false"
        @retry="s.load"
      />
      <template v-if="policy"
        ><view v-if="stale" class="ins-warn"
          >最新费用暂不可用，请查看官方政策。</view
        ><view class="ins-row"
          ><view class="ins-h2">先看懂这 5 种情况</view
          ><text class="ins-badge">{{ cityName }}</text></view
        ><view class="ins-sub">按就业状态与领金情况，选择适合你的路径。</view>
        <button
          v-for="(path, index) in policy.paths"
          :key="path.id"
          class="ins-card ins-path"
          @tap="go(s.link('detail', path.id))"
        >
          <view class="ins-row"
            ><view class="ins-path-title"
              ><text class="ins-path-index">0{{ index + 1 }}</text
              >{{ path.title }}</view
            ><text style="color: #8ba4c9">›</text></view
          ><view class="ins-caption">{{ path.subtitle }}</view
          ><view v-if="s.quote(path.id)" class="ins-number"
            >{{ money(s.quote(path.id)!.totalCents)
            }}<text class="ins-unit"
              >元 / {{ s.quote(path.id)!.unit
              }}{{
                path.id === "resident"
                  ? " · " + policy.resident.year + "年指定年龄档"
                  : " · 最低基数参考"
              }}</text
            ></view
          ><view v-else class="ins-note">{{
            path.id === "employed"
              ? "单位依法办理，按个人工资等核定"
              : "暂无法显示费用，可先查看参保条件"
          }}</view
          ><view v-if="path.id === 'resident'" class="ins-caption"
            >{{ policy.resident.ageLabel }} · 仅医保，不含居民养老</view
          >
        </button>
        <button class="ins-card ins-path fee-entry" @tap="go(s.link('fees'))">
          <view class="ins-row"
            ><view
              ><view class="ins-h3">费用明细与医保账户</view
              ><view class="ins-caption"
                >改基数、看差异，弄清钱交到哪里</view
              ></view
            ><text style="color: #2874ff">↗</text></view
          >
        </button>
        <view class="ins-h2">你可能还想知道</view
        ><view class="ins-card faq"
          ><view v-for="(item, index) in faqs" :key="item.q"
            ><button
              class="faq-q"
              @tap="activeFaq = activeFaq === index ? -1 : index"
            >
              <text>{{ item.q }}</text
              ><text>{{ activeFaq === index ? "−" : "＋" }}</text></button
            ><view v-if="activeFaq === index" class="faq-a">{{
              item.a
            }}</view></view
          ></view
        >
      </template>
      <view class="ins-row"
        ><view class="ins-h2">相关资讯</view
        ><button
          class="ins-link"
          @tap="
            go('/pages/search/index?issue=insurance&region=' + s.cityId.value)
          "
        >
          搜索更多 ›
        </button></view
      ><view class="ins-card feed"
        ><ContentCard
          v-for="item in list.items.value.slice(0, 4)"
          :key="item.id"
          :item="item" /><ListState
          :loading="list.loading.value"
          :error="list.error.value"
          :empty="!list.items.value.length"
          @retry="list.load()"
      /></view> </view
  ></view>
</template>
<style lang="scss">
@use "../insurance.scss";
</style>
<style scoped>
.start-card {
  margin-top: -14px;
  position: relative;
  box-shadow: 0 12px 30px #4381d210;
}
.start-symbol {
  border-radius: 50%;
  height: 43px;
  width: 43px;
  background: #e8f4ff;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #367fff;
  font-size: 24px;
}
.fee-entry {
  background: linear-gradient(125deg, #e6f0ff, #f4f8ff);
  border-color: #dce9ff;
}
.faq {
  padding: 0 18px;
}
.faq-q {
  display: flex;
  justify-content: space-between;
  gap: 15px;
  background: none;
  width: 100%;
  text-align: left;
  font-size: 14px;
  color: #344965;
  padding: 18px 0;
  border-bottom: 1px solid #edf2f9;
  line-height: 1.7;
}
.faq-a {
  font-size: 13px;
  color: #69809e;
  line-height: 1.9;
  padding: 14px 0 20px;
}
.feed {
  padding: 0 14px;
}
</style>
