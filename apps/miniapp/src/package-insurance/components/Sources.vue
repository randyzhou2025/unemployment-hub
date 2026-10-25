<script setup lang="ts">
import type { InsurancePolicy } from "@uh/contracts";
const props = defineProps<{ policy: InsurancePolicy; ids?: string[] }>();
function copy(url: string) {
  uni.setClipboardData({ data: url });
}
</script>
<template>
  <view class="ins-card ins-sources"
    ><view class="ins-h3">政策依据与官方办理</view
    ><view class="ins-caption">复制链接，在浏览器查看原文</view
    ><button
      v-for="source in props.policy.sources.filter(
        (s) => !props.ids || props.ids.includes(s.id),
      )"
      :key="source.id"
      class="ins-source"
      @tap="copy(source.url)"
    >
      <view
        >{{ source.title
        }}<view class="ins-caption">{{ source.institution }}</view></view
      ><text>↗</text>
    </button></view
  >
</template>

<style lang="scss">
@use "../insurance.scss";
</style>
