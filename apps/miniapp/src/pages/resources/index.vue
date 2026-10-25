<script setup lang="ts">
import { ref, watch } from "vue";
import { onLoad, onPullDownRefresh } from "@dcloudio/uni-app";
import { usePreferences } from "../../stores/preferences";
import { useContentList } from "../../services/content";
import ContentCard from "../../components/ContentCard.vue";
import ListState from "../../components/ListState.vue";
const p = usePreferences();
const issue = ref("");
onLoad((q) => {
  issue.value = q?.issue === "benefits" ? "benefits" : "";
});
const list = useContentList(() => ({
  region: p.value.region,
  kind: "resource",
  issue: issue.value,
}));
watch(
  () => [p.value.region, issue.value],
  () => void list.load(),
  { immediate: true },
);
onPullDownRefresh(async () => {
  await list.load();
  uni.stopPullDownRefresh();
});
function city() {
  uni.showActionSheet({
    itemList: ["上海", "全国通用"],
    success: (r) =>
      p.update({ region: r.tapIndex === 0 ? "310000" : "national" }),
  });
}
</script>
<template>
  <view class="resource-view"
    ><view class="resource-intro"
      ><view class="resource-title">常用办事入口</view
      ><view class="resource-note">认准官方渠道，办理更安心</view
      ><button class="resource-city" @tap="city">
        ⌖ {{ p.value.region === "310000" ? "上海" : "全国通用" }}⌄
      </button></view
    ><view class="page"
      ><view class="notice">复制入口链接，在浏览器中办理。</view
      ><view class="resource-list"
        ><ContentCard
          v-for="item in list.items.value"
          :key="item.id"
          :item="item" /><ListState
          :loading="list.loading.value"
          :error="list.error.value"
          :empty="!list.items.value.length"
          @retry="list.load()" /></view></view
  ></view>
</template>
<style scoped>
.resource-view {
  max-width: 560px;
  margin: auto;
}
.resource-intro {
  padding: 25px 20px 23px;
  background: linear-gradient(130deg, #e1edff, #f7fbff);
  position: relative;
}
.resource-title {
  font-size: 24px;
  font-weight: 650;
}
.resource-note {
  font-size: 12px;
  color: #8c9fbb;
  margin-top: 6px;
}
.resource-city {
  font-size: 12px;
  color: #6087be;
  background: #ffffffdf;
  border-radius: 20px;
  padding: 8px 11px;
  position: absolute;
  right: 18px;
  top: 29px;
  min-height: 38px;
}
.resource-list {
  background: #fff;
  border-radius: 14px;
  padding: 0 15px;
  margin-top: 17px;
}
</style>
