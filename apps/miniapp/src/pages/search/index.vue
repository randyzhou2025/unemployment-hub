<script setup lang="ts">
import { ref, watch } from "vue";
import { onLoad, onUnload } from "@dcloudio/uni-app";
import { usePreferences } from "../../stores/preferences";
import { useContentList } from "../../services/content";
import ContentCard from "../../components/ContentCard.vue";
import ListState from "../../components/ListState.vue";
const p = usePreferences(),
  input = ref(""),
  query = ref(""),
  kind = ref("");
const issue = ref(""),
  searchRegion = ref(p.value.region as string);
onLoad((q) => {
  if (q?.issue === "insurance") {
    issue.value = "insurance";
    if (/^\d{6}$/.test(String(q.region))) searchRegion.value = String(q.region);
    void list.load();
  }
});
const list = useContentList(() => ({
  q: query.value,
  region: searchRegion.value,
  issue: issue.value,
  kind: kind.value,
}));
let timer: ReturnType<typeof setTimeout> | undefined;
watch(input, () => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    query.value = input.value.trim();
  }, 350);
});
watch(
  () => [query.value, kind.value],
  () => void list.load(),
);
onUnload(() => clearTimeout(timer));
function search(value?: string) {
  clearTimeout(timer);
  if (value !== undefined) input.value = value;
  query.value = input.value.trim();
  void list.load();
}
</script>
<template>
  <view class="page"
    ><view class="row"
      ><input
        v-model="input"
        class="input"
        placeholder="政策、社保、预算、求职…"
        :maxlength="80"
        confirm-type="search"
        focus
        @confirm="search()"
      /><button class="small-button" @tap="search()">搜索</button></view
    ><view class="hint"
      >当前范围：{{
        searchRegion === "national"
          ? "全国通用"
          : searchRegion === "310000"
            ? "上海及全国通用"
            : "所选城市及全国通用"
      }}</view
    ><view v-if="!query" class="section"
      ><view class="section-title">可以从这些问题开始</view
      ><view class="chips" style="margin-top: 16px"
        ><button
          v-for="term in ['离职', '失业金', '医保', '预算', '求职', '重新就业']"
          :key="term"
          class="pill"
          @tap="search(term)"
        >
          {{ term }}
        </button></view
      ></view
    ><template v-else
      ><view class="chips section"
        ><button
          v-for="tab in [
            { key: '', label: '全部' },
            { key: 'article', label: '资讯' },
            { key: 'guide', label: '指南' },
            { key: 'resource', label: '渠道' },
          ]"
          :key="tab.key"
          class="pill"
          :class="{ active: kind === tab.key }"
          @tap="kind = tab.key"
        >
          {{ tab.label }}
        </button></view
      ><ContentCard
        v-for="item in list.items.value"
        :key="item.id"
        :item="item"
      /><ListState
        :loading="list.loading.value"
        :error="list.error.value"
        :empty="!list.items.value.length"
        @retry="list.load()"
      /><button
        v-if="list.nextCursor.value !== null"
        class="link"
        @tap="list.load(true)"
      >
        继续查看 ↓
      </button></template
    ></view
  >
</template>
