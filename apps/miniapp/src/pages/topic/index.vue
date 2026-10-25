<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { topics } from "../../features/topics";
import { useCatalog } from "../../stores/catalog";
import { issues } from "@uh/domain";
import { usePreferences } from "../../stores/preferences";
import { useContentList } from "../../services/content";
import { go } from "../../services/navigation";
import BlueIcon from "../../components/BlueIcon.vue";
import ContentCard from "../../components/ContentCard.vue";
import ListState from "../../components/ListState.vue";
const key = ref("benefits"),
  p = usePreferences();
const sectionId = ref("");
const catalog = useCatalog();
const topic = computed(() => {
  const base = topics.find((t) => t.key === key.value) || {
    key: "living",
    title: "生活安排",
    subtitle: "安排过渡期生活",
    icon: "budget",
    tone: "blue",
    intro: "收支、生活与日常安排，逐一理清楚。",
  };
  const configured = catalog.homeSections.find(
    (s) => s.id === sectionId.value && s.destination === key.value,
  );
  return configured
    ? { ...base, ...configured, key: key.value, intro: configured.subtitle }
    : base;
});
const list = useContentList(() => ({
  region: p.value.region,
  issue: topic.value.key,
  kind: "article",
}));
onLoad((q) => {
  if (q?.key === "training") {
    uni.redirectTo({ url: "/package-training/home/index" });
    return;
  }
  if (q?.key === "insurance") {
    uni.redirectTo({ url: "/package-insurance/home/index" });
    return;
  }
  key.value = issues.some((i) => i.key === q?.key)
    ? String(q?.key)
    : "benefits";
  sectionId.value = String(q?.section || "");
  void catalog.refreshHome();
});
watch(
  () => topic.value.title,
  (title) => uni.setNavigationBarTitle({ title }),
  { immediate: true },
);
watch(
  () => [key.value, p.value.region],
  () => void list.load(),
  { immediate: true },
);
const guideStage = computed(
  () =>
    (
      ({
        benefits: "newly",
        insurance: "newly",
        rights: "preparing",
        training: "seeking",
        jobs: "seeking",
        safety: "seeking",
        living: "between",
      }) as Record<string, string>
    )[topic.value.key],
);
</script>
<template>
  <view class="topic-page"
    ><view class="topic-header"
      ><BlueIcon :name="topic.icon" :tone="topic.tone" :size="48" /><view
        class="topic-name"
        >{{ topic.title }}</view
      ><view class="topic-intro">{{ topic.intro }}</view
      ><view class="topic-region">{{
        p.value.region === "310000" ? "上海及全国通用信息" : "全国通用信息"
      }}</view></view
    ><view class="page"
      ><button
        class="topic-guide"
        @tap="go('/pages/guide/detail?id=guide-' + guideStage)"
      >
        <view
          ><view class="topic-guide-title">先从一份行动清单开始</view
          ><view class="muted">整理要准备的材料和下一步</view></view
        ><text>›</text></button
      ><view class="section-title section">相关资讯</view
      ><view class="topic-feed"
        ><ContentCard
          v-for="item in list.items.value"
          :key="item.id"
          :item="item" /><ListState
          :loading="list.loading.value"
          :error="list.error.value"
          :empty="!list.items.value.length"
          @retry="list.load()" /></view
      ><button
        class="secondary section"
        style="width: 100%"
        @tap="go('/pages/resources/index')"
      >
        查看官方办事与服务入口
      </button></view
    ></view
  >
</template>
<style scoped>
.topic-page {
  max-width: 560px;
  margin: auto;
}
.topic-header {
  background: linear-gradient(140deg, #deebff, #f3f8ff);
  padding: 26px 22px 24px;
}
.topic-name {
  font-size: 25px;
  font-weight: 650;
  margin-top: 13px;
}
.topic-intro {
  font-size: 13px;
  color: #788eaf;
  line-height: 1.8;
  margin-top: 8px;
}
.topic-region {
  font-size: 11px;
  color: #93a4be;
  margin-top: 12px;
}
.topic-guide {
  background: #fff;
  border: 1px solid #e8effa;
  border-radius: 13px;
  padding: 17px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  text-align: left;
}
.topic-guide-title {
  font-weight: 600;
  font-size: 15px;
  margin-bottom: 4px;
}
.topic-guide .muted {
  font-size: 12px;
}
.topic-guide > text {
  font-size: 24px;
  color: #4284ef;
}
.topic-feed {
  background: white;
  border-radius: 14px;
  margin-top: 10px;
  padding: 0 16px;
}
</style>
