<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { ElMessage } from "element-plus";
import { homeSectionsSchema, type HomeSection } from "@uh/contracts";
import { homeDestinations } from "@uh/domain";
import { api } from "../api";
const props = defineProps<{ canPublish: boolean }>();
const rows = ref<HomeSection[]>([]),
  busy = ref(false),
  loaded = ref(false),
  error = ref("");
const saved = ref("");
const dirty = computed(() => JSON.stringify(rows.value) !== saved.value);
const icons = [
  { key: "benefits", name: "领取" },
  { key: "budget", name: "金额" },
  { key: "insurance", name: "医疗保障" },
  { key: "rights", name: "个人权益" },
  { key: "training", name: "学习培训" },
  { key: "jobs", name: "工作" },
  { key: "safety", name: "安全防护" },
  { key: "check", name: "清单" },
  { key: "link", name: "链接" },
];
const tones = [
  { key: "blue", name: "蓝色" },
  { key: "green", name: "绿色" },
  { key: "orange", name: "橙色" },
  { key: "violet", name: "紫色" },
  { key: "teal", name: "青色" },
  { key: "pink", name: "粉色" },
];
async function load() {
  if (loaded.value && dirty.value) {
    ElMessage.warning("有未发布修改，请先保存后再刷新");
    return;
  }
  try {
    rows.value = await api<HomeSection[]>("/home-sections");
    saved.value = JSON.stringify(rows.value);
    loaded.value = true;
    error.value = "";
  } catch (e) {
    error.value = (e as Error).message;
  }
}
onMounted(load);
defineExpose({ reload: load });
function add() {
  rows.value.push({
    id: "section-" + Date.now().toString(36),
    title: "新板块",
    subtitle: "查看相关资讯",
    icon: "benefits",
    tone: "blue",
    destination: "benefits",
    enabled: false,
  });
}
function move(index: number, delta: number) {
  const row = rows.value.splice(index, 1)[0];
  rows.value.splice(index + delta, 0, row);
}
async function save() {
  const result = homeSectionsSchema.safeParse(rows.value);
  if (!result.success) {
    error.value = result.error.issues.map((i) => i.message).join("；");
    return;
  }
  busy.value = true;
  try {
    rows.value = await api<HomeSection[]>("/home-sections", "PUT", result.data);
    saved.value = JSON.stringify(rows.value);
    error.value = "";
    ElMessage.success("首页板块已发布，小程序返回首页或下拉刷新即可更新");
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <div class="paper">
    <div class="section-actions">
      <div>
        <h3>首页功能板块</h3>
        <p class="muted">
          控制首页宫格入口。顺序从左到右、从上到下；隐藏或移除入口不会删除资讯。
        </p>
      </div>
      <el-tag v-if="loaded"
        >{{ rows.filter((s) => s.enabled).length }} 个显示 /
        {{ rows.length }} 个板块</el-tag
      >
    </div>
    <el-alert v-if="error" :title="error" type="error" :closable="false" />
    <el-alert
      v-if="!props.canPublish"
      title="当前账号可查看配置，发布需要管理员或审核员权限。"
      type="info"
      :closable="false"
    />
    <el-table v-if="loaded" :data="rows" class="section-table" row-key="id">
      <el-table-column label="排序" width="114"
        ><template #default="{ $index }"
          ><el-button
            :disabled="!props.canPublish || $index === 0"
            size="small"
            @click="move($index, -1)"
            >↑</el-button
          ><el-button
            :disabled="!props.canPublish || $index === rows.length - 1"
            size="small"
            @click="move($index, 1)"
            >↓</el-button
          ></template
        ></el-table-column
      >
      <el-table-column label="名称与说明" min-width="180"
        ><template #default="{ row }"
          ><el-input
            v-model="row.title"
            placeholder="板块名称"
            :maxlength="8"
            :disabled="!props.canPublish" /><el-input
            v-model="row.subtitle"
            placeholder="简短说明"
            :maxlength="16"
            :disabled="!props.canPublish"
            style="margin-top: 8px" /></template
      ></el-table-column>
      <el-table-column label="跳转内容" min-width="160"
        ><template #default="{ row }"
          ><el-select v-model="row.destination" :disabled="!props.canPublish"
            ><el-option
              v-for="dest in homeDestinations"
              :key="dest.key"
              :value="dest.key"
              :label="dest.label"
          /></el-select>
          <div class="muted" style="margin-top: 8px">
            {{ row.id }}
          </div></template
        ></el-table-column
      >
      <el-table-column label="图标 / 颜色" min-width="145"
        ><template #default="{ row }"
          ><el-select v-model="row.icon" :disabled="!props.canPublish"
            ><el-option
              v-for="icon in icons"
              :key="icon.key"
              :value="icon.key"
              :label="icon.name" /></el-select
          ><el-select
            v-model="row.tone"
            :disabled="!props.canPublish"
            style="margin-top: 8px"
            ><el-option
              v-for="tone in tones"
              :key="tone.key"
              :value="tone.key"
              :label="tone.name" /></el-select></template
      ></el-table-column>
      <el-table-column label="首页显示" width="96"
        ><template #default="{ row }"
          ><el-switch
            v-model="row.enabled"
            :disabled="!props.canPublish" /></template
      ></el-table-column>
      <el-table-column label="操作" width="74"
        ><template #default="{ $index }"
          ><el-button
            link
            type="danger"
            :disabled="!props.canPublish"
            @click="rows.splice($index, 1)"
            >移除</el-button
          ></template
        ></el-table-column
      >
    </el-table>
    <div v-if="loaded" class="section-actions section-footer">
      <el-button :disabled="!props.canPublish || rows.length >= 18" @click="add"
        >新增板块</el-button
      >
      <div>
        <span v-if="dirty" class="unsaved">有修改待发布</span
        ><el-button
          type="primary"
          :loading="busy"
          :disabled="!props.canPublish || !dirty"
          @click="save"
          >保存并发布板块</el-button
        >
      </div>
    </div>
    <p class="muted">
      可保留 0–18
      个板块，全部隐藏时首页不显示宫格。资讯在“内容与指南”中维护，并按跳转分类归集。
    </p>
  </div>
</template>
<style scoped>
h3 {
  margin: 0;
}
.section-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.section-table {
  margin: 16px 0;
}
.section-footer {
  margin-top: 24px;
}
.unsaved {
  color: #b07825;
  margin-right: 16px;
  font-size: 13px;
}
</style>
