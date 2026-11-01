<script setup lang="ts">
import { ref, computed, watch } from "vue";
import type { Content } from "@uh/contracts";
import { request } from "../services/http";
import { usePersonal } from "../stores/personal";
import { usePreferences } from "../stores/preferences";
import { go, goHome } from "../services/navigation";
const props = defineProps<{ id: string; kind: "guide" | "resource" }>();
const emit = defineEmits<{ loaded: [content: Content] }>();
const content = ref<Content | null>(null), error = ref(""), loading = ref(true);
const personal = usePersonal(), p = usePreferences();
let generation = 0;
async function load() {
  const mine = ++generation;
  loading.value = true;
  error.value = "";
  content.value = null;
  try {
    if (!props.id) throw new Error("链接缺少编号，请返回首页重新选择");
    const result = await request<Content>(`/api/v1/${props.kind === "guide" ? "guides" : "resources"}/${encodeURIComponent(props.id)}`);
    if (mine !== generation) return;
    if (result.kind !== props.kind) throw new Error("该入口暂不可用，请返回首页");
    content.value = result;
    emit("loaded", result);
  } catch (e) {
    if (mine === generation) error.value = (e as Error).message;
  } finally {
    if (mine === generation) loading.value = false;
  }
}
watch(() => [props.id, props.kind], () => void load(), { immediate: true });
const bookmarked = computed(() => personal.bookmarks.some((b) => b.id === props.id && !b.deleted));
function bookmark() {
  if (content.value) personal.toggleBookmark({ id: props.id, title: content.value.title, kind: props.kind });
}
function copy(url: string) { uni.setClipboardData({ data: url }); }
function primaryAction() {
  const c = content.value;
  if (!c) return;
  if (c.kind === "guide") {
    if (personal.addGuide(c.stageKeys[0], c.revision, c.tasks)) go("/pages/tasks/index");
  } else if (c.resourceUrl) copy(c.resourceUrl);
}
function shareWeb() {
  // #ifdef H5
  copy(location.origin + "/#/pages/" + props.kind + "/detail?id=" + encodeURIComponent(props.id));
  // #endif
}
</script>
<template>
  <view class="detail-shell">
    <view v-if="loading" class="empty">正在加载…</view>
    <view v-else-if="error" class="empty"><view>{{ error }}</view><button class="secondary section" @tap="load">重新加载</button><button class="link" @tap="goHome">返回首页</button></view>
    <template v-if="content">
      <view class="detail-heading">
        <view class="detail-label">{{ props.kind === 'guide' ? "事项模板" : "官方渠道" }}</view>
        <view class="detail-title">{{ content.title }}</view>
        <view class="detail-summary">{{ content.summary }}</view>
        <button class="bookmark-button" @tap="bookmark">{{ bookmarked ? "★ 已收藏" : "☆ 收藏" }}</button>
      </view>
      <view class="detail-body" :class="{ 'large-text': p.value.largeText }">
        <template v-if="props.kind === 'guide'">
          <view class="section-title">把需要的事加入待办</view>
          <view class="hint">重复加入会保留已有记录和完成进度。</view>
          <view v-for="(task, i) in content.tasks" :key="task.key" class="task-card">
            <view class="task-index">{{ i + 1 }}</view>
            <view><view class="task-title">{{ task.title }}</view><view class="task-note">{{ task.note }}</view></view>
          </view>
        </template>
        <template v-else>
          <view v-for="source in content.sourceRefs" :key="source.id" class="card source-card"><view class="source-title">{{ source.institution }}</view><view class="task-note">{{ source.title }}</view></view>
          <view v-if="content.resourceUrl" class="card resource-card"><view class="section-title">官方入口</view><view class="resource-url">{{ content.resourceUrl }}</view><view class="hint">复制链接后在浏览器打开，实际办理在官方渠道完成。</view></view>
        </template>
        <view v-if="!personal.saved" class="notice warning section">保存失败，请重试。<button class="small-button" @tap="personal.retrySave">重试保存</button></view>
        <button class="link section" @tap="go('/pages/feedback/index?id=' + content.id)">反馈问题 ›</button>
      </view>
      <view class="detail-footer">
        <!-- #ifdef MP-WEIXIN --><button class="footer-share" open-type="share">分享</button><!-- #endif -->
        <!-- #ifdef H5 --><button class="footer-share" @tap="shareWeb">复制链接</button><!-- #endif -->
        <button class="primary footer-action" @tap="primaryAction">{{ props.kind === 'guide' ? "加入我的待办" : "复制官方入口链接" }}</button>
      </view>
    </template>
  </view>
</template>
<style scoped>
.detail-shell { max-width: 560px; margin: auto; padding-bottom: calc(100px + env(safe-area-inset-bottom)); background: #f5f8fd; min-height: 100vh; }
.detail-heading { padding: 28px 22px 24px; background: linear-gradient(125deg, #dceaff, #f0f6ff); }
.detail-label { color: #6c87ad; font-size: 12px; }
.detail-title { font-size: 25px; font-weight: 650; line-height: 1.5; margin-top: 10px; }
.detail-summary { color: #7d8da7; font-size: 13px; line-height: 1.8; margin-top: 12px; }
.bookmark-button { padding: 8px 12px; min-height: 40px; background: #ffffffc9; border-radius: 12px; color: #5e7eaa; font-size: 12px; margin-top: 14px; }
.detail-body { padding: 24px 18px; }
.task-card { display: flex; gap: 13px; padding: 18px; margin-top: 12px; border-radius: 16px; background: #fff; border: 1px solid #eaf0f8; }
.task-index { flex-shrink: 0; width: 25px; height: 25px; border-radius: 8px; color: #377de5; background: #edf4ff; text-align: center; line-height: 25px; font-size: 12px; }
.task-title, .source-title { font-size: 15px; font-weight: 600; line-height: 1.8; }
.task-note { font-size: 12px; color: #8b98ae; line-height: 1.9; margin-top: 7px; }
.large-text .task-title { font-size: 18px; }
.large-text .task-note { font-size: 16px; }
.source-card, .resource-card { margin-bottom: 15px; }
.resource-url { font-size: 12px; color: #587fbb; word-break: break-all; margin: 14px 0; }
.detail-footer { position: fixed; bottom: 0; left: 0; right: 0; max-width: 560px; margin: auto; padding: 12px 18px calc(12px + env(safe-area-inset-bottom)); display: flex; align-items: center; gap: 15px; background: #ffffffee; border-top: 1px solid #eaf0f8; }
.footer-share { font-size: 12px; color: #7f91ad; min-height: 44px; padding: 10px 0; }
.footer-action { flex: 1; }
</style>
