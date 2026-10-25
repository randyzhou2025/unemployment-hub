<script setup lang="ts">
import { computed } from "vue";
import TopBar from "../../components/TopBar.vue";
import { useAccount } from "../../stores/account";
import { usePersonal } from "../../stores/personal";
import { usePreferences } from "../../stores/preferences";
import { go } from "../../services/navigation";
const account = useAccount();
const personal = usePersonal(),
  p = usePreferences();
const done = computed(
  () => personal.tasks.filter((t) => t.state === "done").length,
);
function privacy() {
  uni.showModal({
    title: "隐私与本机存储",
    content:
      "本应用为独立信息与工具服务。微信登录后自动创建账号，保存微信标识、昵称、注册时间和访问时间。任务、收藏、预算、求职记录与内容偏好仅保存在当前设备，不会上传。清理微信存储或卸载可能丢失。反馈仅提交你主动填写的文字。",
    showCancel: false,
  });
}
function backup() {
  uni.showModal({
    title: "复制本机备份",
    content:
      "将任务、收藏、求职记录和预算复制为 JSON，可能包含个人信息。请保存到你信任的位置。目前尚不支持恢复导入。",
    success: (r) => {
      if (r.confirm)
        uni.setClipboardData({
          data: JSON.stringify(
            {
              version: 1,
              exportedAt: new Date().toISOString(),
              tasks: personal.tasks,
              bookmarks: personal.bookmarks,
              applications: personal.applications,
              budget: uni.getStorageSync("uhb:v1:budget") || null,
            },
            null,
            2,
          ),
        });
    },
  });
}
function changeSize(event: unknown) {
  p.update({
    largeText: (event as { detail: { value: boolean } }).detail.value,
  });
}
</script>
<template>
  <view class="me-view"
    ><TopBar title="我的" subtitle="待办、收藏与求职记录" /><view
      class="me-content"
      ><view class="profile-card"
        ><view class="profile-icon"><image src="/static/blue/brand.png" /></view
        ><view
          ><view class="profile-title">{{ account.user?.nickname || "把下一步，慢慢理清" }}</view
          ><view class="profile-note">待办和进展，随时回来继续</view></view
        ></view
      ><view class="stats"
        ><button @tap="go('/package-records/tasks/index')">
          <text class="stat-value">{{ done }}</text
          ><text class="stat-name">已完成事项</text></button
        ><button @tap="go('/package-records/bookmarks/index')">
          <text class="stat-value">{{
            personal.bookmarks.filter((b) => !b.deleted).length
          }}</text
          ><text class="stat-name">我的收藏</text></button
        ><button @tap="go('/package-records/applications/index')">
          <text class="stat-value">{{
            personal.applications.filter((a) => !a.deleted).length
          }}</text
          ><text class="stat-name">求职记录</text>
        </button></view
      >
      <view class="settings-group"
        ><button class="setting-row" @tap="go('/package-records/tasks/index')">
          <text>我的行动清单</text
          ><text class="setting-right"
            >{{
              personal.tasks.filter((t) => t.state === "todo").length
            }}
            项待办 ›</text
          ></button
        ><button
          class="setting-row"
          @tap="go('/package-records/bookmarks/index')"
        >
          <text>资讯与指南收藏</text
          ><text class="setting-right">›</text></button
        ><button
          class="setting-row"
          @tap="go('/package-records/applications/index')"
        >
          <text>求职进度记录</text><text class="setting-right">›</text>
        </button></view
      >
      <view class="settings-group"
        ><view class="setting-row"
          ><text>大字号阅读</text
          ><switch
            :checked="p.value.largeText"
            color="#2874ff"
            @change="changeSize"
            style="
              transform: scale(0.8);
              transform-origin: right center;
            " /></view
        ><button class="setting-row" @tap="backup">
          <text>复制本机备份</text><text class="setting-right">›</text></button
        ><button class="setting-row" @tap="privacy">
          <text>隐私与本机存储</text
          ><text class="setting-right">›</text></button
        ><button class="setting-row" @tap="go('/pages/feedback/index')">
          <text>反馈与内容纠错</text><text class="setting-right">›</text>
        </button></view
      ></view
    ></view
  >
</template>
<style scoped>
.me-view {
  max-width: 560px;
  margin: auto;
  min-height: 100vh;
  background: linear-gradient(140deg, #dcecff 0, #f6f8fc 320px);
}
.me-content {
  padding: 5px 16px 24px;
}
.profile-card {
  display: flex;
  gap: 13px;
  align-items: center;
  padding: 15px 4px 22px;
}
.profile-icon {
  background: #ffffffdb;
  border-radius: 18px;
  box-shadow: 0 5px 17px #4e86d40c;
  padding: 7px;
  width: 57px;
  height: 57px;
}
.profile-icon image {
  width: 100%;
  height: 100%;
}
.profile-title {
  font-size: 18px;
  font-weight: 650;
}
.profile-note {
  font-size: 11px;
  color: #8c9bb6;
  margin-top: 6px;
}
.stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  background: white;
  border-radius: 14px;
  padding: 17px 0;
  margin-bottom: 16px;
}
.stats button {
  display: flex;
  flex-direction: column;
  border-right: 1px solid #eff2f9;
}
.stats button:last-child {
  border: 0;
}
.stat-value {
  font-size: 25px;
  color: #3282ff;
  font-weight: 600;
  line-height: 1.5;
}
.stat-name {
  font-size: 11px;
  color: #8d9ab1;
  margin-top: 5px;
}
.settings-group {
  margin-top: 17px;
  background: #fff;
  border-radius: 14px;
  padding: 0 16px;
}
.setting-row {
  width: 100%;
  padding: 16px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  min-height: 56px;
  border-bottom: 1px solid #f0f3f8;
  text-align: left;
}
.setting-row:last-child {
  border-bottom: 0;
}
.setting-right {
  color: #a0adc3;
  font-size: 12px;
}
</style>
