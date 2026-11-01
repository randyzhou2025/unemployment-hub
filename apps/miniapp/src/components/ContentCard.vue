<script setup lang="ts">
import type { ContentSummary } from "@uh/contracts";
import { openContent } from "../services/navigation";
const props = defineProps<{ item: ContentSummary }>();
</script>
<template>
  <button v-if="props.item.kind !== 'article'" class="resource-entry" @tap="openContent(props.item)">
    <view class="entry-copy"><view class="entry-title">{{ props.item.title }}</view><view class="entry-note">{{ props.item.summary }}</view></view><text class="entry-arrow">›</text>
  </button>
</template>
<style scoped>
.resource-entry { display: flex; gap: 15px; align-items: center; width: 100%; text-align: left; padding: 19px 0; border-bottom: 1px solid #eef1f6; }
.entry-copy { flex: 1; min-width: 0; }
.entry-title { font-size: 15px; font-weight: 600; line-height: 1.7; color: #263650; }
.entry-note { font-size: 12px; line-height: 1.8; color: #8d9ab0; margin-top: 7px; }
.entry-arrow { color: #8aa5cb; font-size: 24px; }
</style>
