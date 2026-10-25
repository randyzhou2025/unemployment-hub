<script setup lang="ts">
import { go } from "../../services/navigation";
import { computed, ref } from "vue";
import { stages, type StageKey } from "@uh/domain";
import { usePersonal, type Task } from "../../stores/personal";
import { usePreferences } from "../../stores/preferences";
const personal = usePersonal(),
  p = usePreferences();
const filter = ref<StageKey | null>(p.value.stage);
const tasks = computed(() =>
  personal.tasks.filter(
    (t) => !t.deleted && (!filter.value || t.stage === filter.value),
  ),
);
const completed = computed(
  () => tasks.value.filter((t) => t.state === "done").length,
);
function change(task: Task) {
  uni.showActionSheet({
    itemList: ["待办", "已完成", "不适用"],
    success: (r) =>
      personal.setTask({
        ...task,
        state: (["todo", "done", "not-applicable"] as const)[r.tapIndex],
      }),
  });
}
</script>
<template>
  <view class="page"
    ><text class="kicker">ONE THING AT A TIME</text
    ><view class="page-title">完成一件，<br />就少一件挂念。</view
    ><view class="subtitle" style="margin-top: 14px"
      >已完成 {{ completed }} / {{ tasks.length }} 项</view
    ><scroll-view :show-scrollbar="false" scroll-x class="scroller section"
      ><view class="scroll-items"
        ><button class="pill" :class="{ active: !filter }" @tap="filter = null">
          全部阶段</button
        ><button
          v-for="s in stages"
          :key="s.key"
          class="pill"
          :class="{ active: filter === s.key }"
          @tap="filter = s.key"
        >
          {{ s.short }}
        </button></view
      ></scroll-view
    ><view v-if="!personal.saved" class="notice warning section"
      >保存失败，请检查存储空间后重试。<button
        class="small-button"
        @tap="personal.retrySave"
      >
        重试保存
      </button></view
    ><view v-for="task in tasks" :key="task.id" class="card task"
      ><button
        class="checkbox"
        :class="{ done: task.state === 'done' }"
        @tap="
          personal.setTask({
            ...task,
            state: task.state === 'done' ? 'todo' : 'done',
          })
        "
      >
        {{ task.state === "done" ? "✓" : "" }}</button
      ><view class="task-copy"
        ><view
          :class="{ doneTitle: task.state === 'done' }"
          style="font-weight: 550"
          >{{ task.title }}</view
        ><view class="muted" style="margin-top: 8px">{{ task.note }}</view
        ><button class="status" @tap="change(task)">
          {{
            task.state === "done"
              ? "已完成"
              : task.state === "not-applicable"
                ? "不适用"
                : "待办"
          }}
          · 更改状态
        </button></view
      ></view
    ><view v-if="!tasks.length" class="task-start"
      ><view class="task-start-title">{{
        personal.tasks.some((t) => !t.deleted)
          ? "这个阶段还没有待办"
          : "先把需要做的事，加入清单"
      }}</view
      ><view class="task-start-note"
        >选择阶段查看事项，加入后即可勾选完成。</view
      ><button
        v-for="s in stages"
        :key="s.key"
        class="task-stage-entry"
        @tap="go('/pages/guide/detail?id=guide-' + s.key)"
      >
        <view
          ><view class="task-stage-title">{{ s.label }}</view
          ><view class="task-stage-note">{{ s.description }}</view></view
        ><text class="task-stage-arrow">›</text>
      </button></view
    ><button
      v-else
      class="link section"
      @tap="go('/pages/guide/detail?id=guide-' + (filter || 'newly'))"
    >
      查看{{ stages.find((s) => s.key === (filter || "newly"))?.label }}事项建议
      ›
    </button></view
  >
</template>
<style scoped>
.task {
  display: flex;
  gap: 14px;
  margin-top: 14px;
}
.checkbox {
  width: 28px;
  height: 28px;
  min-width: 28px;
  border: 1px solid #b6c8e7;
  border-radius: 9px;
  margin-top: 0;
  line-height: 26px;
  position: relative;
}
.checkbox:before {
  content: "";
  position: absolute;
  inset: -8px;
}
.checkbox.done {
  background: #2874ff;
  color: white;
  border-color: #2874ff;
}
.task-copy {
  flex: 1;
}
.doneTitle {
  color: #9ba6b8;
  text-decoration: line-through;
}
.status {
  font-size: 11px;
  min-height: 44px;
  padding-top: 10px;
  color: #5085d4;
  text-align: left;
}
</style>

<style scoped>
.task-start {
  margin-top: 26px;
}
.task-start-title {
  font-size: 18px;
  font-weight: 600;
  color: #27344c;
  line-height: 1.7;
}
.task-start-note {
  font-size: 13px;
  color: #8996ab;
  line-height: 1.9;
  margin: 8px 0 18px;
}
.task-stage-entry {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  background: #fff;
  border: 1px solid #edf1f8;
  border-radius: 14px;
  padding: 17px 16px;
  text-align: left;
  margin-top: 10px;
  min-height: 70px;
}
.task-stage-title {
  font-size: 15px;
  font-weight: 550;
  color: #354761;
  line-height: 1.7;
}
.task-stage-note {
  font-size: 12px;
  color: #8e9cb2;
  line-height: 1.8;
  margin-top: 4px;
}
.task-stage-arrow {
  color: #6c94d8;
  font-size: 23px;
  flex-shrink: 0;
}
</style>
