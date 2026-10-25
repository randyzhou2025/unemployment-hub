<script setup lang="ts">
import { computed } from "vue";
import { usePersonal } from "../../stores/personal";
import { openContent } from "../../services/navigation";
const personal = usePersonal();
const items = computed(() => personal.bookmarks.filter((b) => !b.deleted));
</script>
<template>
  <view class="page"
    ><text class="kicker">KEEP WHAT MATTERS</text
    ><view class="page-title">留给之后的自己。</view
    ><view class="subtitle" style="margin: 14px 0 25px"
      >{{ items.length }} 篇收藏</view
    ><view v-if="!personal.saved" class="notice warning"
      >保存失败，请检查存储空间后重试。<button
        class="small-button"
        @tap="personal.retrySave"
      >
        重试保存
      </button></view
    ><view
      v-for="item in items"
      :key="item.id"
      class="card"
      style="margin-bottom: 12px"
      ><button
        style="text-align: left; width: 100%; font-weight: 550"
        @tap="openContent(item)"
      >
        {{ item.title }}</button
      ><button
        class="small-button"
        style="text-align: left; margin-top: 8px"
        @tap="personal.toggleBookmark(item)"
      >
        取消收藏
      </button></view
    ><view v-if="!items.length" class="empty"
      >看到有用的文章、指南和渠道时，<br />可以先收藏，之后再慢慢看。</view
    ></view
  >
</template>
