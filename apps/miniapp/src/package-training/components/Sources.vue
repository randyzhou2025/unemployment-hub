<script setup lang="ts">
import type { TrainingCatalog } from "@uh/contracts";
const props = defineProps<{ catalog: TrainingCatalog; ids: string[] }>();
function copy(url: string) {
  uni.setClipboardData({ data: url });
}
</script>
<template>
  <view class="tr-card"
    ><view class="tr-h3">查原文，再做决定</view
    ><view class="tr-caption">点击复制官方或评价机构链接，在浏览器查看</view>
    <button
      v-for="s in props.catalog.sources.filter((v) => props.ids.includes(v.id))"
      :key="s.id"
      class="tr-source"
      @tap="copy(s.url)"
    >
      <view class="tr-source-title"
        >{{ s.title
        }}<view class="tr-note">{{ s.url.split("/")[2] }}</view></view
      ><text class="tr-arrow">↗</text>
    </button>
  </view>
</template>
<style lang="scss">
@use "../training.scss";
</style>
