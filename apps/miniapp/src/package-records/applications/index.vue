<script setup lang="ts">
import { ref, computed } from "vue";
import { applicationStatuses } from "@uh/domain";
import { usePersonal } from "../../stores/personal";
import { go } from "../../services/navigation";
const personal = usePersonal(),
  filter = ref("");
function add() {
  const id =
    "a-" +
    Date.now().toString(36) +
    "-" +
    Math.random().toString(36).slice(2, 9);
  go("/package-records/applications/edit?newId=" + id);
}
const items = computed(() =>
  personal.applications
    .filter((a) => !a.deleted && (!filter.value || a.status === filter.value))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
);
</script>
<template>
  <view class="page"
    ><text class="kicker">EVERY TRY COUNTS</text
    ><view class="page-title">机会与进展，<br />有处安放。</view
    ><view class="row section"
      ><text class="muted"
        >{{
          personal.applications.filter((a) => !a.deleted).length
        }}
        条记录</text
      ><button class="secondary" @tap="add">＋ 添加</button></view
    ><scroll-view :show-scrollbar="false" scroll-x class="scroller section"
      ><view class="scroll-items"
        ><button class="pill" :class="{ active: !filter }" @tap="filter = ''">
          全部</button
        ><button
          v-for="status in applicationStatuses"
          :key="status"
          class="pill"
          :class="{ active: filter === status }"
          @tap="filter = status"
        >
          {{ status }}
        </button></view
      ></scroll-view
    ><button
      v-for="item in items"
      :key="item.id"
      class="card application"
      @tap="go('/package-records/applications/edit?id=' + item.id)"
    >
      <view class="row"
        ><view class="company">{{ item.company || "未填写公司" }}</view
        ><text class="chip">{{ item.status }}</text></view
      ><view class="role">{{ item.role || "未填写岗位" }}</view
      ><view v-if="item.nextStep" class="next"
        >下一步 · {{ item.nextStep }}</view
      ><view class="hint">{{ item.date || "未设置日期" }} ›</view></button
    ><view v-if="!items.length" class="empty"
      >这里还没有{{
        filter || "求职"
      }}记录。<br />从一个感兴趣的机会开始就好。</view
    ></view
  >
</template>
<style scoped>
.application {
  margin-top: 14px;
  text-align: left;
  width: 100%;
}
.company {
  font-size: 16px;
  font-weight: 600;
}
.role {
  font-size: 14px;
  color: #7d8ba4;
  margin-top: 7px;
}
.next {
  font-size: 13px;
  border-top: 1px solid #edf1f7;
  padding-top: 12px;
  margin-top: 16px;
  color: #5085d4;
}
</style>
