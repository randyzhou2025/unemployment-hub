<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  trainingCatalogSchema,
  trainingGrades,
  trainingGradeLabels,
  trainingCategories,
  registrationLabels,
  type TrainingCatalog,
  type TrainingRecord,
  type TrainingProject,
} from "@uh/contracts";
import { api } from "../api";
const props = defineProps<{ canPublish: boolean }>();
const form = ref<TrainingCatalog | null>(null),
  version = ref(0),
  saved = ref(""),
  busy = ref(false),
  error = ref(""),
  selected = ref(""),
  tab = ref("projects"),
  reviewed = ref(false),
  published = ref(false);
const dirty = computed(
  () => !!form.value && JSON.stringify(form.value) !== saved.value,
);
const project = computed(() =>
  form.value?.projects.find((p) => p.id === selected.value),
);
function apply(row: TrainingRecord) {
  form.value = JSON.parse(JSON.stringify(row.draft));
  version.value = row.version;
  saved.value = JSON.stringify(form.value);
  published.value = !!row.published;
  if (!form.value!.projects.some((p) => p.id === selected.value))
    selected.value = form.value!.projects[0]?.id || "";
  reviewed.value = false;
  error.value = "";
}
async function load() {
  if (dirty.value) {
    ElMessage.warning("有未保存修改，请先保存或放弃修改");
    return;
  }
  busy.value = true;
  try {
    apply(await api<TrainingRecord>("/training-catalog"));
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
async function discard() {
  try {
    await ElMessageBox.confirm(
      "放弃尚未保存的培训补贴修改并重新加载？",
      "重新加载",
    );
  } catch {
    return;
  }
  saved.value = JSON.stringify(form.value);
  await load();
}
async function save(publish: boolean) {
  const result = trainingCatalogSchema.safeParse(form.value);
  if (!result.success) {
    error.value = result.error.issues
      .map((i) => i.path.join(".") + "：" + i.message)
      .join("；");
    return;
  }
  if (publish && !reviewed.value) return;
  busy.value = true;
  try {
    apply(
      await api<TrainingRecord>("/training-catalog", "PUT", {
        catalog: result.data,
        publish,
        baseVersion: version.value,
      }),
    );
    ElMessage.success(publish ? "已发布到小程序" : "草稿已保存，前台未改变");
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
function addProject() {
  if (!form.value) return;
  const id = "project-" + Date.now();
  const p: TrainingProject = {
    id,
    title: "新项目",
    fullName: "新项目",
    enabled: false,
    category: "digital-ai",
    subsidyClass: "A",
    summary: "请填写项目用途和适合人群",
    referenceLevel: "l4",
    levels: [
      {
        key: "l4",
        registrationMode: "confirm",
        registrationNote: "请核实机构、等级及当期申报方式",
        feeCents: null,
        feeNote: "请按官方公告核实评价费；培训费另计",
      },
    ],
    requirements: "请核实学历、经历或前置证书要求",
    steps: ["请填写官方报名步骤"],
    registrationSourceId: form.value.sources[0].id,
    sourceIds: [form.value.sources[0].id],
    noticeDate: new Date().toISOString().slice(0, 10),
    noticeNote: "待核查的年度资料，不代表当前开放报名",
  };
  form.value.projects.push(p);
  selected.value = id;
}
async function removeProject() {
  if (!form.value || !project.value) return;
  try {
    await ElMessageBox.confirm(
      "从草稿删除该项目？只有发布后才影响前台。",
      "删除项目",
    );
  } catch {
    return;
  }
  form.value.projects = form.value.projects.filter((p) => p !== project.value);
  selected.value = form.value.projects[0]?.id || "";
}
function moveProject(delta: number) {
  if (!form.value || !project.value) return;
  const rows = form.value.projects,
    i = rows.indexOf(project.value),
    target = i + delta;
  if (target >= 0 && target < rows.length)
    [rows[i], rows[target]] = [rows[target], rows[i]];
}
function lines(value: string) {
  return value
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}
defineExpose({ reload: load });
onMounted(load);
</script>
<template>
  <section class="training-editor" v-loading="busy">
    <div class="editor-heading">
      <div>
        <h2>培训补贴 · 上海</h2>
        <p>独立维护项目、标准、报名与费用。保存草稿不改变前台，核查后发布。</p>
      </div>
      <el-tag :type="dirty ? 'warning' : 'info'"
        >{{
          dirty ? "有未保存修改" : published ? "已有发布版本" : "尚未发布"
        }}
        · v{{ version }}</el-tag
      >
    </div>
    <el-alert
      v-if="error"
      :title="error"
      type="error"
      :closable="false"
      show-icon
    />
    <template v-if="form">
      <el-tabs v-model="tab">
        <el-tab-pane label="项目与报名" name="projects">
          <div class="project-toolbar">
            <el-select
              v-model="selected"
              placeholder="选择项目"
              style="width: 320px"
              ><el-option
                v-for="p in form.projects"
                :key="p.id"
                :label="p.title + (p.enabled ? '' : '（隐藏）')"
                :value="p.id" /></el-select
            ><el-button @click="addProject">新增项目</el-button
            ><el-button
              v-if="project"
              type="danger"
              plain
              @click="removeProject"
              >删除当前项目</el-button
            >
          </div>
          <el-form v-if="project" label-position="top" class="project-form">
            <div class="form-grid">
              <el-form-item label="项目名称"
                ><el-input
                  v-model="project.title"
                  maxlength="80" /></el-form-item
              ><el-form-item label="完整职业 / 方向名称"
                ><el-input
                  v-model="project.fullName"
                  maxlength="80" /></el-form-item
              ><el-form-item label="项目标识（固定，用于分享与导航）"
                ><el-input :model-value="project.id" readonly
              /></el-form-item>
            </div>
            <el-form-item label="项目简介"
              ><el-input v-model="project.summary" type="textarea" :rows="2"
            /></el-form-item>
            <el-form-item label="申报条件"
              ><el-input
                v-model="project.requirements"
                type="textarea"
                :rows="3"
            /></el-form-item>
            <el-form-item label="列表参考等级（须为下方已维护等级）"
              ><el-select v-model="project.referenceLevel"
                ><el-option
                  v-for="l in project.levels"
                  :key="l.key"
                  :label="trainingGradeLabels[l.key]"
                  :value="l.key" /></el-select
            ></el-form-item>
            <h3>各等级报名方式与评价费</h3>
            <p class="editor-note">
              只维护已核查的等级。评价费留空表示按方向或公告确认；金额不含培训费。
            </p>
            <div v-for="(l, i) in project.levels" :key="i" class="level-panel">
              <div class="form-grid">
                <el-form-item label="等级"
                  ><el-select v-model="l.key"
                    ><el-option
                      v-for="g in trainingGrades"
                      :key="g"
                      :label="trainingGradeLabels[g]"
                      :value="g" /></el-select></el-form-item
                ><el-form-item label="报名方式"
                  ><el-select v-model="l.registrationMode"
                    ><el-option
                      v-for="(label, key) in registrationLabels"
                      :key="key"
                      :label="label"
                      :value="key" /></el-select></el-form-item
                ><el-form-item label="评价费（元，可清空）"
                  ><el-input-number
                    :model-value="
                      l.feeCents === null ? undefined : l.feeCents / 100
                    "
                    :min="0"
                    :precision="2"
                    :max="100000"
                    @update:model-value="
                      (v: number | undefined) =>
                        (l.feeCents = v == null ? null : Math.round(v * 100))
                    " /></el-form-item
                ><el-form-item label="移除该等级"
                  ><el-button
                    type="danger"
                    plain
                    @click="project.levels.splice(i, 1)"
                    >移除</el-button
                  ></el-form-item
                >
              </div>
              <el-form-item label="报名说明"
                ><el-input
                  v-model="l.registrationNote"
                  type="textarea"
                  :rows="2" /></el-form-item
              ><el-form-item label="费用来源、适用方向与时间说明"
                ><el-input v-model="l.feeNote" type="textarea" :rows="2"
              /></el-form-item>
            </div>
            <el-button
              @click="
                project.levels.push({
                  key:
                    trainingGrades.find(
                      (g) => !project!.levels.some((l) => l.key === g),
                    ) || 'l4',
                  registrationMode: 'confirm',
                  registrationNote: '请核实当期报名条件与渠道',
                  feeCents: null,
                  feeNote: '请按机构公告核实费用，培训费另计',
                })
              "
              :disabled="project.levels.length >= 6"
              >增加等级</el-button
            >
            <el-form-item label="报名步骤（每行一步）"
              ><el-input
                :model-value="project.steps.join('\n')"
                type="textarea"
                :rows="4"
                @update:model-value="
                  (v: string) => (project!.steps = lines(v))
                "
            /></el-form-item>
            <div class="form-grid">
              <el-form-item label="资料整理日期"
                ><el-input
                  v-model="project.noticeDate"
                  type="date" /></el-form-item
              ><el-form-item label="主要报名指引来源"
                ><el-select v-model="project.registrationSourceId"
                  ><el-option
                    v-for="s in form.sources"
                    :key="s.id"
                    :label="s.title"
                    :value="s.id" /></el-select
              ></el-form-item>
            </div>
            <el-form-item label="时效说明（前台显示）"
              ><el-input
                v-model="project.noticeNote"
                type="textarea"
                :rows="2" /></el-form-item
            ><el-form-item label="项目资料来源"
              ><el-select v-model="project.sourceIds" multiple
                ><el-option
                  v-for="s in form.sources"
                  :key="s.id"
                  :label="s.title"
                  :value="s.id" /></el-select
            ></el-form-item>
            <div class="project-toolbar">
              <el-button
                :disabled="form.projects[0] === project"
                @click="moveProject(-1)"
                >向前排序</el-button
              ><el-button
                :disabled="form.projects[form.projects.length - 1] === project"
                @click="moveProject(1)"
                >向后排序</el-button
              >
            </div>
          </el-form>
        </el-tab-pane>
        <el-tab-pane label="补贴标准与身份对照" name="rates">
          <p class="editor-note">
            单位：元 / 次。市级目录基准独立维护，不与工会或区级资助自动相加。
          </p>
          <el-table
            :data="(['A', 'B', 'C'] as const).map((key) => ({ key }))"
            border
            ><el-table-column label="分类" width="80"
              ><template #default="{ row }"
                >{{ row.key }} 类</template
              ></el-table-column
            ><el-table-column
              v-for="g in trainingGrades"
              :key="g"
              :label="trainingGradeLabels[g]"
              min-width="155"
              ><template #default="{ row }"
                ><el-input-number
                  :model-value="
                    form!.rates[row.key as 'A' | 'B' | 'C'][g] / 100
                  "
                  :min="0"
                  :max="100000"
                  :controls="false"
                  @update:model-value="
                    (v: number | undefined) =>
                      (form!.rates[row.key as 'A' | 'B' | 'C'][g] = Math.round(
                        (v || 0) * 100,
                      ))
                  " /></template></el-table-column
          ></el-table>
          <h3>身份条件对照</h3>
          <div v-for="c in form.contexts" :key="c.id" class="level-panel">
            <div class="form-grid">
              <el-form-item label="选项名称"
                ><el-input v-model="c.label" /></el-form-item
              ><el-form-item label="参考比例（%，清空表示不换算）"
                ><el-input-number
                  :model-value="
                    c.ratioBps === null ? undefined : c.ratioBps / 100
                  "
                  :min="0"
                  :max="150"
                  @update:model-value="
                    (v: number | undefined) =>
                      (c.ratioBps = v == null ? null : Math.round(v * 100))
                  "
              /></el-form-item>
            </div>
            <el-input v-model="c.note" type="textarea" :rows="2" />
          </div>
        </el-tab-pane>
        <el-tab-pane label="政策与申领指南" name="policy">
          <el-form label-position="top"
            ><div class="form-grid">
              <el-form-item label="模块前台开放"
                ><el-switch v-model="form.enabled" /></el-form-item
              ><el-form-item label="目录年份"
                ><el-input-number
                  v-model="form.year"
                  :min="2026" /></el-form-item
              ><el-form-item label="目录生效日"
                ><el-input
                  v-model="form.effectiveFrom"
                  type="date" /></el-form-item
              ><el-form-item label="本次目录截止日"
                ><el-input
                  v-model="form.effectiveTo"
                  type="date" /></el-form-item
              ><el-form-item label="实际政策核查日"
                ><el-input
                  v-model="form.verifiedOn"
                  type="date" /></el-form-item
              ><el-form-item label="下次复核日"
                ><el-input v-model="form.reviewDueAt" type="date"
              /></el-form-item>
            </div>
            <h3>政策问答</h3>
            <div
              v-for="(item, i) in form.policyItems"
              :key="i"
              class="level-panel"
            >
              <el-form-item label="问题标题"
                ><el-input v-model="item.title" /></el-form-item
              ><el-form-item label="政策摘要"
                ><el-input
                  v-model="item.text"
                  type="textarea"
                  :rows="3" /></el-form-item
              ><el-form-item label="对应来源"
                ><el-select v-model="item.sourceIds" multiple
                  ><el-option
                    v-for="s in form.sources"
                    :key="s.id"
                    :label="s.title"
                    :value="s.id" /></el-select></el-form-item
              ><el-button
                type="danger"
                plain
                @click="form.policyItems.splice(i, 1)"
                >移除条目</el-button
              >
            </div>
            <el-button
              @click="
                form.policyItems.push({
                  title: '新政策条目',
                  text: '请按官方原文填写政策说明',
                  sourceIds: [form.sources[0].id],
                })
              "
              >增加政策条目</el-button
            >
            <el-form-item label="申请步骤（每行一步）"
              ><el-input
                :model-value="form.applicationSteps.join('\n')"
                type="textarea"
                :rows="5"
                @update:model-value="
                  (v: string) => (form!.applicationSteps = lines(v))
                " /></el-form-item
            ><el-form-item label="申领指南官方来源"
              ><el-select v-model="form.policySourceIds" multiple
                ><el-option
                  v-for="s in form.sources"
                  :key="s.id"
                  :label="s.title"
                  :value="s.id" /></el-select
            ></el-form-item>
          </el-form>
        </el-tab-pane>
        <el-tab-pane label="官方与机构来源" name="sources"
          ><p class="editor-note">
            只填官方政策与评价机构页面。删除来源前，先移除项目或政策中的引用。链接采用
            HTTPS。
          </p>
          <div
            v-for="(s, i) in form.sources"
            :key="i"
            class="level-panel source-form"
          >
            <el-input v-model="s.id" placeholder="唯一来源标识" /><el-input
              v-model="s.title"
              placeholder="来源标题"
            /><el-input
              v-model="s.url"
              placeholder="https:// 官方或机构链接"
            /><el-button type="danger" plain @click="form.sources.splice(i, 1)"
              >移除</el-button
            >
          </div>
          <el-button
            @click="
              form.sources.push({
                id: 'source-' + Date.now(),
                title: '新资料来源',
                url: '',
              })
            "
            >增加来源</el-button
          ></el-tab-pane
        >
      </el-tabs>
      <div class="save-bar">
        <el-checkbox v-model="reviewed" :disabled="!canPublish"
          >已实际核查政策标准、适用条件与项目公告时间</el-checkbox
        >
        <div>
          <el-button :disabled="busy" @click="discard"
            >放弃修改并重新加载</el-button
          ><el-button :disabled="busy || !canPublish" @click="save(false)"
            >保存草稿</el-button
          ><el-button
            type="primary"
            :disabled="busy || !canPublish || !reviewed"
            @click="save(true)"
            >发布到小程序</el-button
          >
        </div>
        <p v-if="!props.canPublish">
          当前账号可查看，发布与政策维护需要管理员或审核员权限。
        </p>
      </div> </template
    ><el-button v-else @click="load">重新加载</el-button>
  </section>
</template>
<style scoped>
.training-editor {
  padding-bottom: 140px;
}
.editor-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}
.editor-heading p,
.editor-note {
  font-size: 13px;
  color: #7e899d;
  line-height: 1.8;
}
.project-toolbar {
  display: flex;
  gap: 12px;
  margin: 18px 0;
  align-items: center;
}
.project-form {
  max-width: 1040px;
}
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 20px;
}
.level-panel {
  padding: 18px;
  background: #f6f8fc;
  border: 1px solid #e9eef7;
  border-radius: 12px;
  margin: 14px 0;
}
.source-form {
  display: grid;
  grid-template-columns: 150px 1fr 2fr auto;
  gap: 12px;
}
.save-bar {
  position: sticky;
  bottom: 0;
  background: #fffffff5;
  border-top: 1px solid #e6ebf3;
  padding: 18px 0 12px;
  margin-top: 22px;
  z-index: 3;
}
.save-bar > div {
  margin-top: 12px;
}
.el-form-item {
  margin-top: 16px;
}
.el-input-number {
  max-width: 100%;
}
h3 {
  font-size: 16px;
  margin-top: 25px;
}
@media (max-width: 900px) {
  .form-grid,
  .source-form {
    grid-template-columns: 1fr;
  }
  .editor-heading {
    display: block;
  }
}
</style>
