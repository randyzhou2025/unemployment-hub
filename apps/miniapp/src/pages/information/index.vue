<script setup lang="ts">
import { ref, watch } from "vue";
import {
  onPullDownRefresh,
  onReachBottom,
  onShareAppMessage,
} from "@dcloudio/uni-app";
import { usePreferences } from "../../stores/preferences";
import { useContentList } from "../../services/content";
import TopBar from "../../components/TopBar.vue";
import ContentCard from "../../components/ContentCard.vue";
import ListState from "../../components/ListState.vue";
import { go } from "../../services/navigation";
const p = usePreferences(),
  selected = ref("");
const tabs = [
  { key: "", label: "推荐" },
  { key: "policy", label: "政策解读" },
  { key: "benefits", label: "失业金" },
  { key: "insurance", label: "社保医保" },
  { key: "training", label: "补贴培训" },
  { key: "rights", label: "离职权益" },
  { key: "jobs", label: "求职指南" },
  { key: "safety", label: "防骗指南" },
];
const list = useContentList(() => ({
  kind: "article",
  region: p.value.region,
  issue: selected.value === "policy" ? "" : selected.value,
}));
watch(
  () => [selected.value, p.value.region],
  () => void list.load(),
  { immediate: true },
);
onPullDownRefresh(async () => {
  await list.load();
  uni.stopPullDownRefresh();
});
onReachBottom(() => {
  if (!list.loading.value && list.nextCursor.value !== null)
    void list.load(true);
});
onShareAppMessage(() => ({
  title: "失业有数 · 实用资讯",
  path: "/pages/information/index",
}));
</script>
<template>
  <view class="information"
    ><view class="information-top"
      ><TopBar title="资讯" subtitle="准确 · 及时 · 实用" /><scroll-view
        scroll-x
        :show-scrollbar="false"
        class="tab-scroller"
        ><view class="info-tabs"
          ><button
            v-for="tab in tabs"
            :key="tab.key"
            class="info-tab"
            :class="{ selected: selected === tab.key }"
            @tap="selected = tab.key"
          >
            {{ tab.label }}
          </button></view
        ></scroll-view
      ></view
    ><view class="info-content"
      ><ContentCard
        v-for="item in list.items.value.filter(
          (i) => selected !== 'policy' || i.attribution === 'policy_summary',
        )"
        :key="item.id"
        :item="item"
      /><ListState
        :loading="list.loading.value"
        :error="list.error.value"
        :empty="
          !list.items.value.filter(
            (i) => selected !== 'policy' || i.attribution === 'policy_summary',
          ).length
        "
        @retry="list.load()"
      /><button
        v-if="list.nextCursor.value !== null"
        class="link"
        @tap="list.load(true)"
      >
        加载更多 ↓</button
      ><button class="info-search" @tap="go('/pages/search/index')">
        ⌕ 搜索更多资讯
      </button></view
    ></view
  >
</template>
<style scoped>
.information {
  max-width: 560px;
  margin: auto;
  min-height: 100vh;
  background: #fff;
}
.information-top {
  background: linear-gradient(125deg, #dfedff, #f8fbff 85%);
}
.tab-scroller {
  width: 100%;
  white-space: nowrap;
  background: #ffffff80;
}
.info-tabs {
  display: inline-flex;
  gap: 24px;
  padding: 2px 18px 0;
}
.info-tab {
  min-height: 48px;
  font-size: 14px;
  color: #858fa5;
  position: relative;
}
.info-tab.selected {
  color: #1f2b43;
  font-weight: 650;
}
.info-tab.selected:after {
  content: "";
  position: absolute;
  width: 24px;
  height: 3px;
  border-radius: 3px;
  bottom: 5px;
  left: 50%;
  margin-left: -12px;
  background: #287aff;
}
.info-content {
  padding: 0 18px 24px;
}
.info-search {
  font-size: 13px;
  color: #7e92b2;
  background: #f5f8fe;
  padding: 13px;
  border-radius: 10px;
  width: 100%;
  margin-top: 20px;
}
</style>
