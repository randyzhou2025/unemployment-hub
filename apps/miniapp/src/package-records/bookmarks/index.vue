<script setup lang="ts">
import { computed } from "vue";
import { usePersonal } from "../../stores/personal";
import { openContent } from "../../services/navigation";
const personal = usePersonal();
const items = computed(() => personal.bookmarks.filter((b) => !b.deleted && b.kind !== "article"));
</script>
<template>
  <view class="page"
    ><text class="kicker">KEEP WHAT MATTERS</text
    ><view class="page-title">留给之后的自己。</view
    ><view class="subtitle" style="margin: 14px 0 25px"
      >{{ items.length }} 项收藏</view
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
      >收藏需要的事项清单和官方渠道，<br />之后可以直接回来使用。</view
    ></view
  >
</template>
