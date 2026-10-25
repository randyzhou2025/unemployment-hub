<script setup lang="ts">
import type { ContentSummary } from "@uh/contracts";
import { issues } from "@uh/domain";
import { thumbnailFor } from "../features/topics";
import { openContent } from "../services/navigation";
const props = defineProps<{ item: ContentSummary; compact?: boolean }>();
function dateLabel() {
  const date = props.item.publishedAt.slice(5, 10).split("-");
  return Number(date[0]) + "月" + Number(date[1]) + "日";
}
</script>
<template>
  <button
    class="article-row"
    :class="{ compact: props.compact }"
    @tap="openContent(props.item)"
  >
    <view class="article-copy"
      ><view class="article-name">{{ props.item.title }}</view
      ><view v-if="!props.compact" class="article-desc">{{
        props.item.summary
      }}</view
      ><view class="article-meta"
        ><text
          class="category-tag"
          :class="'category-' + props.item.issueKeys[0]"
          >{{
            issues.find((i) => i.key === props.item.issueKeys[0])?.label ||
            "实用指南"
          }}</text
        ><text>{{ dateLabel() }}</text
        ><text>{{
          props.item.scope === "national" ? "通用" : "上海"
        }}</text></view
      ></view
    ><image
      class="article-thumb"
      :src="thumbnailFor(props.item)"
      mode="aspectFill"
    />
  </button>
</template>
<style scoped>
.article-row {
  display: flex;
  width: 100%;
  gap: 14px;
  text-align: left;
  padding: 19px 0;
  border-bottom: 1px solid #eef1f6;
  align-items: center;
}
.article-copy {
  flex: 1;
  min-width: 0;
}
.article-name {
  font-size: 15px;
  line-height: 1.65;
  font-weight: 600;
  color: #202a40;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.article-desc {
  font-size: 12px;
  line-height: 1.7;
  color: #929bb0;
  margin-top: 6px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.article-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 10px;
  color: #98a3b8;
  margin-top: 9px;
}
.category-tag {
  background: #edf4ff;
  color: #6596e4;
  padding: 1px 5px;
  border-radius: 3px;
  white-space: nowrap;
}
.category-benefits {
  color: #ed8993;
  background: #fff0f1;
}
.category-insurance {
  color: #5c9eee;
  background: #edf5ff;
}
.category-rights {
  color: #ed917a;
  background: #fff0e9;
}
.category-training {
  color: #e69f59;
  background: #fff4e8;
}
.category-safety {
  color: #aa8de4;
  background: #f6efff;
}
.category-jobs {
  color: #58b69e;
  background: #ecf9f4;
}
.article-thumb {
  width: 86px;
  height: 78px;
  flex-shrink: 0;
  border-radius: 7px;
  background: #eff4fb;
}
.compact {
  padding: 16px 0;
}
.compact .article-desc {
  display: none;
}
.compact .article-thumb {
  width: 82px;
  height: 74px;
}
.compact .article-name {
  font-size: 15px;
}
</style>
