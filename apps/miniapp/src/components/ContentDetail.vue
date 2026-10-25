<script setup lang="ts">
import { ref, computed, watch, getCurrentInstance } from "vue";
import type { Content } from "@uh/contracts";
import { request } from "../services/http";
import { usePersonal } from "../stores/personal";
import { usePreferences } from "../stores/preferences";
import { go, goHome } from "../services/navigation";
import { thumbnailFor } from "../features/topics";
const props = defineProps<{ id: string }>();
const emit = defineEmits<{ loaded: [content: Content] }>();
const content = ref<Content | null>(null),
  error = ref(""),
  loading = ref(true);
const personal = usePersonal(),
  p = usePreferences();
const instance = getCurrentInstance();
let generation = 0;
async function load() {
  const mine = ++generation;
  loading.value = true;
  error.value = "";
  try {
    if (!props.id) throw new Error("链接缺少内容编号，请返回首页重新查找");
    const result = await request<Content>(
      "/api/v1/contents/" + encodeURIComponent(props.id),
    );
    if (mine !== generation) return;
    content.value = result;
    emit("loaded", result);
  } catch (e) {
    if (mine === generation) {
      error.value = (e as Error).message;
      content.value = null;
    }
  } finally {
    if (mine === generation) loading.value = false;
  }
}
watch(
  () => props.id,
  () => void load(),
  { immediate: true },
);
const bookmarked = computed(() =>
  personal.bookmarks.some((b) => b.id === props.id && !b.deleted),
);
const cover = computed(() =>
  content.value?.issueKeys.includes("benefits")
    ? "/static/blue/hero.jpg"
    : content.value
      ? thumbnailFor(content.value)
      : "",
);
function bookmark() {
  if (content.value)
    personal.toggleBookmark({
      id: props.id,
      title: content.value.title,
      kind: content.value.kind,
    });
}
function copy(url: string) {
  uni.setClipboardData({ data: url });
}
function addTasks() {
  const c = content.value;
  if (c && personal.addGuide(c.stageKeys[0], c.revision, c.tasks))
    go("/package-records/tasks/index");
}
const actionLabel = computed(() =>
  content.value?.kind === "guide"
    ? "加入我的行动清单"
    : content.value?.kind === "resource"
      ? "复制官方入口链接"
      : content.value?.sourceRefs.length
        ? "查看官方政策原文"
        : "查看相关行动指南",
);
function primaryAction() {
  const c = content.value;
  if (!c) return;
  if (c.kind === "guide") addTasks();
  else if (c.kind === "resource" && c.resourceUrl) copy(c.resourceUrl);
  else if (c.sourceRefs.length) {
    const query = uni.createSelectorQuery().in(instance?.proxy);
    query.select("#official-sources").boundingClientRect();
    query.selectViewport().scrollOffset(() => {});
    query.exec(([source, viewport]) => {
      if (source && viewport)
        uni.pageScrollTo({
          scrollTop: Math.max(0, source.top + viewport.scrollTop - 12),
          duration: 200,
        });
    });
  } else go("/pages/guide/detail?id=guide-" + c.stageKeys[0]);
}
function shareWeb() {
  // #ifdef H5
  copy(
    location.origin +
      "/#/pages/" +
      (content.value?.kind || "article") +
      "/detail?id=" +
      encodeURIComponent(props.id),
  );
  // #endif
}
</script>
<template>
  <view class="detail-shell"
    ><view v-if="loading" class="empty">正在加载内容…</view
    ><view v-else-if="error" class="empty"
      ><view>{{ error }}</view
      ><button class="secondary section" @tap="load">重新加载</button
      ><button class="link" @tap="goHome">返回首页</button></view
    ><template v-if="content"
      ><view class="detail-cover"
        ><image :src="cover" mode="aspectFill" /><view
          class="cover-wash" /></view
      ><view class="article-paper"
        ><view class="article-title">{{ content.title }}</view
        ><view class="article-meta-row"
          ><view class="byline"
            >{{ content.attribution === "editorial" ? "编辑整理" : "政策解读"
            }}<text class="meta-space">{{
              content.publishedAt.slice(0, 10)
            }}</text></view
          ><button class="bookmark-chip" @tap="bookmark">
            {{ bookmarked ? "★ 已收藏" : "☆ 收藏" }}
          </button></view
        ><view class="article-scope"
          >{{ content.scope === "national" ? "全国通用" : "适用上海"
          }}<text v-if="content.effectiveFrom">
            · {{ content.effectiveFrom }}起生效</text
          ></view
        >
        <view
          v-if="content.verificationState === 'needs_review'"
          class="notice warning section"
          >内容可能已有更新，请查看最新官方信息。</view
        ><view
          v-if="
            content.scope === 'specified_regions' && p.value.region !== '310000'
          "
          class="notice warning section"
          >以下为上海政策，请确认你的办理地区。</view
        >
        <view v-if="content.keyPoints.length" class="keypoints"
          ><view class="keypoints-title">文章要点</view
          ><view
            v-for="point in content.keyPoints"
            :key="point"
            class="keypoint"
            ><text class="check-dot">✓</text><text>{{ point }}</text></view
          ></view
        >
        <view
          class="reading-body"
          :class="{ 'reading-large': p.value.largeText }"
          ><template v-for="(block, i) in content.body" :key="i"
            ><view v-if="block.type === 'heading'" class="heading">{{
              block.text
            }}</view
            ><view v-else-if="block.type === 'list'"
              ><view
                v-for="(item, j) in block.items"
                :key="j"
                class="list-item"
                >{{ item }}</view
              ></view
            ><view v-else-if="block.type === 'notice'" class="notice">{{
              block.text
            }}</view
            ><view v-else class="paragraph">{{ block.text }}</view></template
          ></view
        >
        <view v-if="content.kind === 'guide'" class="guide-tasks section"
          ><view class="section-title">我的行动清单</view
          ><view
            v-for="(task, i) in content.tasks"
            :key="task.key"
            class="guide-task"
            ><view class="task-index">{{ i + 1 }}</view
            ><view
              ><view class="task-title">{{ task.title }}</view
              ><view class="task-note">{{ task.note }}</view></view
            ></view
          ><view class="hint"
            >加入清单后由你勾选，重复添加保留已有进度。</view
          ></view
        >
        <view v-if="content.resourceUrl" class="resource-box section"
          ><view class="section-title">官方渠道</view
          ><view class="resource-url">{{ content.resourceUrl }}</view
          ><view class="hint"
            >复制链接后在浏览器打开，实际办理在官方渠道完成。</view
          ></view
        >
        <view
          v-if="content.sourceRefs.length"
          id="official-sources"
          class="source-section"
          ><view class="source-section-title">政策来源</view
          ><view
            v-for="source in content.sourceRefs"
            :key="source.id"
            class="source-item"
            ><view class="source-name">{{ source.title }}</view
            ><view class="source-meta"
              >{{ source.institution
              }}<text v-if="source.publishedAt">
                · {{ source.publishedAt }}</text
              ></view
            ><button class="source-copy" @tap="copy(source.url)">
              查看官方原文 · 复制链接 ↗
            </button></view
          ></view
        >
        <view v-if="!personal.saved" class="notice warning section"
          >保存失败，请重试。<button
            class="small-button"
            @tap="personal.retrySave"
          >
            重试保存
          </button></view
        ><view class="article-bottom-row"
          ><button @tap="go('/pages/feedback/index?id=' + content.id)">
            反馈与纠错</button
          ><button @tap="p.update({ largeText: !p.value.largeText })">
            {{ p.value.largeText ? "标准字号" : "大字号阅读" }}
          </button></view
        ></view
      >
      <view class="detail-footer"
        ><!-- #ifdef MP-WEIXIN --><button
          class="footer-share"
          open-type="share"
        >
          <text>↗</text><text class="share-label">分享</text></button
        ><!-- #endif --><!-- #ifdef H5 --><button
          class="footer-share"
          @tap="shareWeb"
        >
          <text>↗</text><text class="share-label">复制链接</text></button
        ><!-- #endif --><button
          class="primary footer-action"
          @tap="primaryAction"
        >
          {{ actionLabel }}
        </button></view
      ></template
    ></view
  >
</template>
<style scoped>
.detail-shell {
  max-width: 560px;
  margin: auto;
  padding-bottom: calc(90px + env(safe-area-inset-bottom));
  background: #f5f8fd;
  min-height: 100vh;
}
.detail-cover {
  height: 184px;
  position: relative;
  overflow: hidden;
  background: #dceaff;
}
.detail-cover image {
  width: 100%;
  height: 100%;
  position: absolute;
  inset: 0;
}
.cover-wash {
  position: absolute;
  inset: 0;
  background: linear-gradient(transparent 60%, #eff4ff55);
}
.article-paper {
  background: #fff;
  border-radius: 18px 18px 0 0;
  padding: 22px 20px 15px;
  margin-top: -13px;
  position: relative;
  z-index: 1;
  min-height: 60vh;
}
.article-title {
  font-size: 24px;
  font-weight: 650;
  letter-spacing: -0.4px;
  line-height: 1.5;
  color: #17243b;
}
.article-meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 14px;
}
.byline {
  font-size: 11px;
  color: #8b96ad;
}
.meta-space {
  margin-left: 10px;
}
.bookmark-chip {
  background: #f5f7fb;
  border-radius: 8px;
  padding: 6px 10px;
  min-height: 36px;
  font-size: 11px;
  color: #8590a6;
  white-space: nowrap;
}
.article-scope {
  font-size: 10px;
  color: #a2adbf;
  margin-top: 9px;
}
.keypoints {
  background: linear-gradient(130deg, #edf4ff, #f2f6ff);
  padding: 17px 16px;
  border-radius: 10px;
  margin-top: 22px;
}
.keypoints-title {
  font-size: 16px;
  font-weight: 600;
  color: #2976f5;
  margin-bottom: 10px;
}
.keypoint {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  margin-top: 8px;
  font-size: 13px;
  line-height: 1.85;
  color: #59677f;
}
.check-dot {
  font-size: 9px;
  line-height: 15px;
  min-width: 15px;
  height: 15px;
  border-radius: 50%;
  text-align: center;
  color: white;
  background: #5895ff;
  margin-top: 5px;
}
.guide-task {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 19px 0;
  border-bottom: 1px solid #edf2f8;
}
.task-index {
  width: 23px;
  height: 23px;
  flex-shrink: 0;
  border-radius: 50%;
  line-height: 23px;
  text-align: center;
  font-size: 12px;
  color: #fff;
  background: #3986ff;
  margin-top: 1px;
}
.task-title {
  font-size: 15px;
  font-weight: 550;
  color: #2c3850;
}
.task-note {
  font-size: 12px;
  color: #8b98af;
  line-height: 1.8;
  margin-top: 7px;
}
.resource-box {
  background: #f2f7ff;
  border: 1px solid #e5eefb;
  border-radius: 12px;
  padding: 18px;
}
.resource-url {
  font-size: 12px;
  color: #7d97bd;
  word-break: break-all;
  line-height: 1.8;
  margin-top: 10px;
}
.source-section {
  border-top: 1px solid #edf1f8;
  padding-top: 22px;
  margin-top: 28px;
}
.source-section-title {
  font-size: 16px;
  font-weight: 600;
}
.source-item {
  padding: 16px 0;
  border-bottom: 1px solid #f0f3f8;
}
.source-name {
  font-size: 13px;
  line-height: 1.7;
  color: #5d6f89;
}
.source-meta {
  font-size: 11px;
  color: #99a6bc;
  margin-top: 7px;
}
.source-copy {
  font-size: 12px;
  color: #4e8ae5;
  min-height: 44px;
  text-align: left;
  padding-top: 10px;
}
.article-bottom-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 25px;
}
.article-bottom-row button {
  font-size: 11px;
  color: #96a4bd;
  min-height: 44px;
}
.detail-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  margin: auto;
  max-width: 560px;
  z-index: 5;
  background: #fff;
  border-top: 1px solid #edf1f7;
  padding: 10px 18px calc(10px + env(safe-area-inset-bottom));
  display: flex;
  gap: 16px;
  align-items: center;
}
.footer-share {
  min-width: 48px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  color: #7b8aa6;
  line-height: 1.2;
}
.share-label {
  font-size: 10px;
  margin-top: 4px;
}
.footer-action {
  flex: 1;
  font-size: 14px;
  min-height: 46px;
  padding: 12px 8px;
}
</style>
