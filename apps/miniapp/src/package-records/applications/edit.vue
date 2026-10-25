<script setup lang="ts">
import { back } from "../../services/navigation";
import { reactive, ref, watch } from "vue";
import { onLoad, onHide, onUnload } from "@dcloudio/uni-app";
import { applicationStatuses } from "@uh/domain";
import { usePersonal, type Application } from "../../stores/personal";
const personal = usePersonal();
const id =
  "a-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 9);
const form = reactive<Application>({
  id,
  company: "",
  role: "",
  status: "待投递",
  nextStep: "",
  date: "",
  notes: "",
  updatedAt: new Date().toISOString(),
});
const ready = ref(false),
  saved = ref(true),
  missing = ref(false);
let timer: ReturnType<typeof setTimeout> | undefined;
onLoad((q) => {
  if (q?.id || q?.newId) {
    const requestedId = String(q.id || q.newId);
    const existing = personal.applications.find(
      (a) => a.id === requestedId && !a.deleted,
    );
    if (existing) Object.assign(form, existing);
    else if (q.id) missing.value = true;
    else form.id = requestedId;
  }
  ready.value = true;
});
function hasInput() {
  return !!(
    form.company.trim() ||
    form.role.trim() ||
    form.nextStep.trim() ||
    form.notes.trim()
  );
}
function flush() {
  clearTimeout(timer);
  if (!ready.value || missing.value || !hasInput()) return;
  form.updatedAt = new Date().toISOString();
  saved.value = personal.saveApplication({ ...form });
}
watch(
  () => [
    form.company,
    form.role,
    form.status,
    form.nextStep,
    form.date,
    form.notes,
  ],
  () => {
    if (!ready.value) return;
    clearTimeout(timer);
    timer = setTimeout(flush, 400);
  },
);
onHide(flush);
onUnload(flush);
function status() {
  uni.showActionSheet({
    itemList: [...applicationStatuses],
    success: (r) => {
      form.status = applicationStatuses[r.tapIndex];
      flush();
    },
  });
}
function remove() {
  uni.showModal({
    title: "删除这条求职记录？",
    content: "删除后不会出现在列表中。",
    success: (r) => {
      if (r.confirm) {
        clearTimeout(timer);
        form.deleted = true;
        const success = personal.saveApplication({
          ...form,
          deleted: true,
          updatedAt: new Date().toISOString(),
        });
        if (success) {
          ready.value = false;
          leave();
        } else saved.value = false;
      }
    },
  });
}
function done() {
  if (!hasInput()) {
    uni.showToast({ title: "先填写一项公司、岗位或跟进内容", icon: "none" });
    return;
  }
  flush();
  if (saved.value) {
    ready.value = false;
    leave();
  }
}
function leave() {
  if (getCurrentPages().length > 1) uni.navigateBack();
  else uni.redirectTo({ url: "/package-records/applications/index" });
}
</script>
<template>
  <view class="page"
    ><view v-if="missing" class="empty"
      >记录不存在或已删除。<button class="secondary section" @tap="back()">
        返回列表
      </button></view
    ><template v-else
      ><text class="kicker">A PLACE FOR YOUR NEXT STEP</text
      ><view class="page-title">记录一个机会。</view
      ><view class="subtitle" style="margin: 12px 0 25px"
        >自动保存，之后可以继续编辑。</view
      ><view class="field"
        ><text class="label">公司</text
        ><input
          v-model="form.company"
          class="input"
          placeholder="公司名称"
          maxlength="100"
          @blur="flush" /></view
      ><view class="field"
        ><text class="label">岗位</text
        ><input
          v-model="form.role"
          class="input"
          placeholder="感兴趣的职位"
          maxlength="100"
          @blur="flush" /></view
      ><view class="field"
        ><text class="label">当前进展</text
        ><button class="input row" @tap="status">
          <text>{{ form.status }}</text
          ><text>⌄</text>
        </button></view
      ><view class="field"
        ><text class="label">下一步跟进</text
        ><input
          v-model="form.nextStep"
          class="input"
          placeholder="例如：周五前确认面试时间"
          maxlength="200"
          @blur="flush" /></view
      ><view class="field"
        ><text class="label">下一步日期（可选）</text
        ><picker
          mode="date"
          :value="form.date"
          @change="
            form.date = $event.detail.value;
            flush();
          "
          ><view class="input">{{ form.date || "选择日期" }}</view></picker
        ><button
          v-if="form.date"
          class="small-button"
          @tap="
            form.date = '';
            flush();
          "
        >
          清除日期
        </button></view
      ><view class="field"
        ><text class="label">备注</text
        ><textarea
          v-model="form.notes"
          class="input"
          style="height: 140px"
          maxlength="2000"
          :adjust-position="true"
          :cursor-spacing="24"
          placeholder="记录工作要求、面试反馈，或想进一步了解的问题"
          @blur="flush"
        /></view
      ><view class="save-state" :class="{ error: !saved }"
        >{{ saved ? "已自动保存" : "保存失败，请重试"
        }}<button v-if="!saved" class="small-button" @tap="flush">
          重试保存
        </button></view
      ><button class="primary" @tap="done">完成</button
      ><button
        v-if="personal.applications.some((a) => a.id === form.id)"
        class="small-button danger section"
        @tap="remove"
      >
        删除这条记录
      </button></template
    ></view
  >
</template>
