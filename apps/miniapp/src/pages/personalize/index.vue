<script setup lang="ts">
import { onLoad } from "@dcloudio/uni-app";
// 兼容旧版入口，直接进入现有清单；不重做问卷，也不改写个人记录。
onLoad(() => uni.redirectTo({ url: "/package-records/tasks/index" }));
</script>
<template><view class="page muted">正在打开行动清单…</view></template>
