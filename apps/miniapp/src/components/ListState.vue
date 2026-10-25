<script setup lang="ts">
const props = defineProps<{
  loading: boolean;
  error: string;
  empty: boolean;
}>();
defineEmits<{ retry: [] }>();
</script>
<template>
  <view v-if="props.loading" class="empty">加载中…</view
  ><view v-else-if="props.error" class="empty"
    ><view>{{ props.error }}</view
    ><button class="secondary" style="margin-top: 14px" @tap="$emit('retry')">
      重新加载
    </button></view
  ><view v-else-if="props.empty" class="empty"
    >暂无相关内容，可以试试其他分类。</view
  >
</template>
