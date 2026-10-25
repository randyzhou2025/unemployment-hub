<script setup lang="ts">
import { watch, computed } from "vue";
import {
  onShow,
  onPullDownRefresh,
  onShareAppMessage,
} from "@dcloudio/uni-app";
import { brand } from "@uh/domain";
import { useCatalog } from "../../stores/catalog";
import type { HomeSection } from "@uh/contracts";
import { usePreferences } from "../../stores/preferences";
import { useContentList } from "../../services/content";
import { go, goInformation } from "../../services/navigation";
import TopBar from "../../components/TopBar.vue";
import BlueIcon from "../../components/BlueIcon.vue";
import ContentCard from "../../components/ContentCard.vue";
import ListState from "../../components/ListState.vue";
const p = usePreferences();
const catalog = useCatalog();
onShow(() => void catalog.refreshHome());
function openSection(section: HomeSection) {
  go(
    section.destination === "benefit-center"
      ? "/pages/benefits/index"
      : section.destination === "insurance"
        ? "/package-insurance/home/index"
        : section.destination === "training"
          ? "/package-training/home/index"
          : "/pages/topic/index?key=" +
            section.destination +
            "&section=" +
            section.id,
  );
}
const articles = useContentList(() => ({
  region: p.value.region,
  kind: "article",
}));
watch(
  () => p.value.region,
  () => void articles.load(),
  { immediate: true },
);
const featured = computed(() =>
  [...articles.items.value].sort(
    (a, b) =>
      Number(b.attribution === "policy_summary") -
      Number(a.attribution === "policy_summary"),
  ),
);
function chooseCity() {
  uni.showActionSheet({
    itemList: ["上海", "全国通用"],
    success: (r) =>
      p.update({ region: r.tapIndex === 0 ? "310000" : "national" }),
  });
}
onPullDownRefresh(async () => {
  await Promise.all([articles.load(), catalog.refreshHome()]);
  uni.stopPullDownRefresh();
});
onShareAppMessage(() => ({
  title: brand.name + " · 了解政策，重新出发",
  path: "/pages/home/index",
}));
</script>
<template>
  <view class="home"
    ><view class="hero-panel"
      ><image
        class="hero-art"
        src="/static/blue/hero.jpg"
        mode="aspectFill"
      /><view class="hero-top-wash" /><TopBar
        title="失业有数"
        subtitle="专业 · 可靠 · 陪你度过这段时光"
        home
        ><button class="city-button" @tap="chooseCity">
          ⌖ {{ p.value.region === "310000" ? "上海" : "全国" }}⌄
        </button></TopBar
      ><view class="hero-message"
        ><view class="hero-title">虽然暂时停下<br />但你依然在前进</view
        ><view class="hero-caption">了解政策 · 规划方向 · 重新出发</view></view
      ><button class="search-entry" @tap="go('/pages/search/index')">
        <text class="search-lens">⌕</text
        ><text>搜索政策、补贴、社保、找工作…</text>
      </button></view
    >
    <view class="home-content"
      ><view v-if="catalog.homeSections.length" class="topic-grid"
        ><button
          v-for="topic in catalog.homeSections"
          :key="topic.id"
          class="topic-tile"
          @tap="openSection(topic)"
        >
          <BlueIcon :name="topic.icon" :tone="topic.tone" :size="37" /><view
            class="topic-title"
            >{{ topic.title }}</view
          ><view class="topic-subtitle">{{ topic.subtitle }}</view>
        </button></view
      >

      <view class="news-section"
        ><view class="row"
          ><view class="section-title">最新资讯</view
          ><button class="more" @tap="goInformation">查看更多 ›</button></view
        ><view class="news-card"
          ><ContentCard
            v-for="item in featured.slice(0, 3)"
            :key="item.id"
            :item="item"
            compact /><ListState
            :loading="articles.loading.value"
            :error="articles.error.value"
            :empty="!articles.items.value.length"
            @retry="articles.load()" /></view></view></view
  ></view>
</template>
<style scoped>
.home {
  max-width: 560px;
  margin: auto;
  background: linear-gradient(#eef5ff 0, #f6f8fb 550px);
  padding-bottom: 20px;
}
.hero-panel {
  height: 312px;
  position: relative;
  overflow: hidden;
  background: #d4e8ff;
}
.hero-art {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.hero-top-wash {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    #c3dfff55 0,
    transparent 45%,
    transparent 79%,
    #d8e8ff9c 100%
  );
}
.city-button {
  position: relative;
  margin-left: auto;
  background: #ffffffd9;
  border: 1px solid #ffffffcf;
  border-radius: 22px;
  min-width: 60px;
  padding: 7px 10px;
  font-size: 12px;
  white-space: nowrap;
  box-shadow: 0 3px 15px #4089df08;
}
.hero-message {
  position: relative;
  padding: 18px 26px;
  max-width: 80%;
}
.hero-title {
  font-family: "Songti SC", "STSong", serif;
  font-weight: 700;
  font-size: 24px;
  color: #102b5c;
  line-height: 1.55;
  letter-spacing: 0.1px;
}
.hero-caption {
  font-size: 11px;
  color: #617da9;
  margin-top: 8px;
}
.search-entry {
  position: absolute;
  bottom: 15px;
  left: 18px;
  right: 18px;
  background: #ffffffee;
  box-shadow: 0 6px 22px #3672cf18;
  border-radius: 25px;
  min-height: 46px;
  display: flex;
  align-items: center;
  gap: 10px;
  text-align: left;
  padding: 10px 17px;
  color: #8c9ab2;
  font-size: 13px;
  border: 1px solid #ffffff;
}
.search-lens {
  font-size: 25px;
  color: #6781a9;
  line-height: 1;
}
.home-content {
  padding: 14px 14px 0;
}
.topic-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 9px;
}
.topic-tile {
  width: 100%;
  background: #ffffffea;
  border-radius: 14px;
  min-height: 106px;
  padding: 14px 3px 11px;
  display: flex;
  align-items: center;
  flex-direction: column;
  box-shadow: 0 4px 14px #587ca503;
}
.topic-title {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.5;
  margin-top: 8px;
  color: #26314a;
}
.topic-subtitle {
  font-size: 10px;
  color: #929db1;
  margin-top: 2px;
  white-space: nowrap;
}
.news-section {
  margin-top: 19px;
}
.more {
  font-size: 12px;
  color: #98a1b5;
  min-height: 44px;
  padding-left: 15px;
}
.news-card {
  background: #fff;
  padding: 0 16px;
  border-radius: 15px;
  margin-top: 5px;
  border: 1px solid #f0f3f9;
}
</style>
<style scoped>
/* #ifdef MP-WEIXIN */
.hero-panel {
  height: 350px;
}
.hero-message {
  padding-top: 14px;
}
/* #endif */
</style>
