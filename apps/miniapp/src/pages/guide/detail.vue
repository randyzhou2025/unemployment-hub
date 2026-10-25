<script setup lang="ts">
import { ref } from "vue";
import { onLoad, onShareAppMessage, onShareTimeline } from "@dcloudio/uni-app";
import type { Content } from "@uh/contracts";
import ContentDetail from "../../components/ContentDetail.vue";
import { contentShare } from "../../platform/sharing";
const id = ref(""),
  title = ref("");
onLoad((q) => {
  id.value = String(q?.id || "");
});
function loaded(c: Content) {
  title.value = c.title;
  uni.setNavigationBarTitle({
    title:
      c.kind === "guide"
        ? "阶段指南"
        : c.kind === "resource"
          ? "官方渠道"
          : "阅读",
  });
}
onShareAppMessage(() => contentShare(id.value, "guide", title.value));
onShareTimeline(() => ({
  title: title.value || "失业有数",
  query: "id=" + encodeURIComponent(id.value),
}));
</script>
<template><ContentDetail :id="id" @loaded="loaded" /></template>
