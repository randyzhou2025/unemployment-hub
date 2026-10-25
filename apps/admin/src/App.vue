<script setup lang="ts">
import { ref, reactive, onMounted, computed } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { stages, issues, tools } from "@uh/domain";
import type { Draft, ContentBlock, Source } from "@uh/contracts";
import { api, embedded } from "./api";
import HomeSections from "./components/HomeSections.vue";
import InsurancePolicyEditor from "./components/InsurancePolicyEditor.vue";
import TrainingCatalogEditor from "./components/TrainingCatalogEditor.vue";
const trainingEditor = ref<InstanceType<typeof TrainingCatalogEditor> | null>(null);
import BenefitPolicyEditor from "./components/BenefitPolicyEditor.vue";
const insuranceEditor = ref<InstanceType<typeof InsurancePolicyEditor> | null>(null);
const insuranceCities = ref<{cityId:string;cityName:string}[]>([]);
async function refreshInsuranceCities() { const records = await api<{draft:{cityId:string;cityName:string}}[]>("/insurance-policies"); insuranceCities.value = records.map(r=>r.draft); }
const homeEditor = ref<InstanceType<typeof HomeSections> | null>(null);
const benefitEditor = ref<InstanceType<typeof BenefitPolicyEditor> | null>(null);
type Row = {
  id: string;
  draft: Draft;
  draftVersion: number;
  state: string;
  currentRevision: number;
  withdrawn: number;
  updatedAt: string;
};
const user = ref<{ username: string; role: string } | null>(null),
  section = ref("contents"),
  busy = ref(false),
  loginForm = reactive({ username: "admin", password: "" }),
  error = ref("");
const rows = ref<Row[]>([]),
  sources = ref<{ id: string; data: Source }[]>([]),
  audit = ref<Record<string, unknown>[]>([]),
  feedback = ref<
    {
      id: string;
      message: string;
      state: string;
      createdAt: string;
      contentId?: string;
    }[]
  >([]),
  disabledTools = ref<string[]>([]);
const labels: Record<string, string> = {
  contents: "内容与指南",
  sources: "资料来源",
  feedback: "用户反馈",
  audit: "操作记录",
  settings: "工具管理",
  home: "首页板块",
  benefits: "失业金政策",
  insurance: "社保医保政策",
  training: "培训补贴",
};
if (embedded) {
  const target = new URLSearchParams(location.search).get("section") || "contents";
  if (target in labels) section.value = target;
}
async function attempt(fn: () => Promise<void>) {
  busy.value = true;
  try {
    await fn();
    error.value = "";
  } catch (e) {
    error.value = (e as Error).message;
    ElMessage.error(error.value);
  } finally {
    busy.value = false;
  }
}
async function login() {
  await attempt(async () => {
    user.value = await api("/login", "POST", loginForm);
    loginForm.password = "";
    await refresh();
  });
}
async function refresh() {
  [rows.value, sources.value, audit.value, feedback.value] = await Promise.all([
    api<Row[]>("/contents"),
    api<{ id: string; data: Source }[]>("/sources"),
    api<Record<string, unknown>[]>("/audit"),
    api<typeof feedback.value>("/feedback"),
  ]);
  disabledTools.value = (
    await api<{ disabledTools: string[] }>("/settings")
  ).disabledTools;
  await refreshInsuranceCities();
  if (section.value === "training") await trainingEditor.value?.reload();
  if (section.value === "insurance") await insuranceEditor.value?.reload();
  if (section.value === "home") await homeEditor.value?.reload();
  if (section.value === "benefits") await benefitEditor.value?.reload();
}
onMounted(async () => {
  try {
    user.value = await api("/me");
    await refresh();
  } catch (e) {
    user.value = null;
    if (embedded) error.value = (e as Error).message;
  }
});
const editing = ref(false),
  editingId = ref(""),
  baseVersion = ref(0),
  keyPointsText = ref(""),
  sourceIds = ref<string[]>([]),
  preview = ref<ContentBlock[]>([]),
  editorError = ref("");
const newDraft = (): Draft => ({
  kind: "article",
  title: "",
  summary: "",
  stageKeys: ["newly"],
  issueKeys: ["living"],
  scope: "national",
  regionIds: [],
  markdown: "## 先说清楚问题\n\n",
  keyPoints: [],
  sourceRefs: [],
  effectiveFrom: null,
  effectiveTo: null,
  reviewDueAt: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  attribution: "editorial",
  tasks: [],
  resourceUrl: null,
});
const form = reactive<Draft>(newDraft());
function open(row?: Row) {
  editingId.value = row?.id || "";
  baseVersion.value = row?.draftVersion || 0;
  Object.assign(form, row ? JSON.parse(JSON.stringify(row.draft)) : newDraft());
  keyPointsText.value = form.keyPoints.join("\n");
  sourceIds.value = form.sourceRefs.map((s) => s.id);
  preview.value = [];
  editorError.value = "";
  editing.value = true;
}
function payload(): Draft {
  return {
    ...form,
    regionIds: form.scope === "national" ? [] : form.regionIds,
    keyPoints: keyPointsText.value
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
    sourceRefs: sourceIds.value
      .map(
        (id) =>
          sources.value.find((s) => s.id === id)?.data ||
          form.sourceRefs.find((s) => s.id === id)!,
      )
      .filter(Boolean),
    resourceUrl: form.kind === "resource" ? form.resourceUrl : null,
  };
}
async function save() {
  busy.value = true;
  try {
    if (editingId.value)
      await api("/contents/" + editingId.value, "PUT", {
        draft: payload(),
        baseVersion: baseVersion.value,
      });
    else await api("/contents", "POST", payload());
    editing.value = false;
    await refresh();
    ElMessage.success("草稿已保存，尚未影响已发布版本");
  } catch (e) {
    editorError.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
async function showPreview() {
  try {
    preview.value = (
      await api<{ body: ContentBlock[] }>("/preview", "POST", payload())
    ).body;
    editorError.value = "";
  } catch (e) {
    editorError.value = (e as Error).message;
  }
}
async function action(row: Row, action: string) {
  const name = {
    submit: "提交审核",
    publish: "发布新版本",
    withdraw: "撤回公开内容",
    return: "退回草稿",
  }[action];
  try {
    await ElMessageBox.confirm(
      `${name}：${row.draft.title}？`,
      "确认内容操作",
      { type: action === "withdraw" ? "warning" : "info" },
    );
  } catch {
    return;
  }
  await attempt(async () => {
    await api(`/contents/${row.id}/${action}`, "POST", {
      baseVersion: row.draftVersion,
    });
    await refresh();
    ElMessage.success("操作完成");
  });
}
const sourceDialog = ref(false),
  sourceVerified = ref(false);
const sourceForm = reactive<Source>({
  id: "",
  title: "",
  institution: "",
  url: "",
  publishedAt: null,
  verifiedAt: null,
});
function openSource(source?: Source) {
  Object.assign(
    sourceForm,
    source || {
      id: "s-" + Date.now(),
      title: "",
      institution: "",
      url: "",
      publishedAt: null,
      verifiedAt: null,
    },
  );
  sourceVerified.value = !!source?.verifiedAt;
  sourceDialog.value = true;
}
async function saveSource() {
  await attempt(async () => {
    await api("/sources", "POST", {
      ...sourceForm,
      verifiedAt: sourceVerified.value ? new Date().toISOString() : null,
    });
    sourceDialog.value = false;
    await refresh();
  });
}
const canPublish = computed(
  () => user.value?.role === "admin" || user.value?.role === "reviewer",
);
async function logout() {
  await api("/logout", "POST");
  user.value = null;
}
</script>
<template>
  <main v-if="embedded && !user" class="paper login"><h2>正在连接管理工作台</h2><p>{{ error || "请稍候…" }}</p><a v-if="error" href="/padmin/" target="_top">返回管理后台</a></main>
  <main v-else-if="!user" class="paper login">
    <div class="muted" style="letter-spacing: 2px">UNEMPLOYMENT HUB</div>
    <h1 style="margin-top: 12px">失业有数内容工作台</h1>
    <p class="muted">核对来源，让每一条信息更可靠。</p>
    <el-form @submit.prevent="login"
      ><el-input
        v-model="loginForm.username"
        aria-label="用户名"
        placeholder="用户名"
        autocomplete="username"
      /><el-input
        v-model="loginForm.password"
        aria-label="密码"
        placeholder="密码"
        type="password"
        show-password
        autocomplete="current-password"
        @keyup.enter="login"
      /><el-alert
        v-if="error"
        :title="error"
        type="error"
        :closable="false"
      /><el-button
        type="primary"
        style="width: 100%; margin-top: 18px"
        :loading="busy"
        @click="login"
        >登录</el-button
      ></el-form
    >
    <p class="muted">开发账号密码保存在 apps/api/.env；不会发送到其他服务。</p>
  </main>
  <div v-else class="shell" :class="{ embedded }">
    <aside v-if="!embedded" class="sidebar">
      <div class="logo">失业有数</div>
      <div class="logo-note">内容与服务工作台</div>
      <button
        v-for="(label, key) in labels"
        :key="key"
        class="nav"
        :class="{ active: section === key }"
        @click="section = String(key)"
      >
        {{ label }}
      </button>
      <div
        class="muted"
        style="color: #a5b69c; margin-top: 40px; padding: 10px"
      >
        {{ user.username }} · {{ user.role }}
      </div>
      <button class="nav" @click="logout">退出登录</button>
    </aside>
    <main class="main">
      <header class="top">
        <div>
          <div v-if="!embedded" class="muted" style="letter-spacing: 2px; margin-bottom: 8px">
            EDITORIAL WORKSPACE
          </div>
          <h1>{{ labels[section] }}</h1>
        </div>
        <div>
          <el-button @click="attempt(refresh)">刷新</el-button
          ><el-button
            v-if="section === 'contents'"
            type="primary"
            @click="open()"
            >新建内容</el-button
          ><el-button
            v-if="section === 'sources'"
            type="primary"
            @click="openSource()"
            >添加来源</el-button
          >
        </div>
      </header>
      <el-alert
        v-if="error"
        :title="error"
        type="error"
        style="margin-bottom: 20px"
        :closable="false"
      />
      <div v-if="section === 'contents'" class="paper">
        <p class="muted" style="margin-top: 0">
          修改先保存草稿，提交审核后再发布。公开内容始终读取最后发布版本。
        </p>
        <el-table :data="rows" stripe
          ><el-table-column label="内容" min-width="280"
            ><template #default="{ row }"
              ><div class="table-title">{{ row.draft.title }}</div>
              <div class="muted">
                {{ row.draft.kind }} ·
                {{ row.draft.scope === "national" ? "全国通用" : "上海" }} ·
                {{
                  row.draft.stageKeys
                    .map((k: string) => stages.find((s) => s.key === k)?.label)
                    .join(" / ")
                }}
              </div></template
            ></el-table-column
          ><el-table-column label="状态" width="135"
            ><template #default="{ row }"
              ><span class="stat">{{
                row.withdrawn
                  ? "已撤回"
                  : row.state === "review"
                    ? "待审核"
                    : row.state === "published"
                      ? "已发布"
                      : "草稿"
              }}</span>
              <div class="muted">
                公开版本 {{ row.currentRevision }}
              </div></template
            ></el-table-column
          ><el-table-column label="下次复核" width="120"
            ><template #default="{ row }">{{
              row.draft.reviewDueAt
            }}</template></el-table-column
          ><el-table-column label="操作" min-width="260"
            ><template #default="{ row }"
              ><div class="list-actions">
                <el-button size="small" @click="open(row)"
                  >编辑 / 预览</el-button
                ><el-button
                  v-if="row.state === 'draft'"
                  size="small"
                  @click="action(row, 'submit')"
                  >提交审核</el-button
                ><el-button
                  v-if="row.state === 'review' && canPublish"
                  size="small"
                  type="primary"
                  @click="action(row, 'publish')"
                  >发布</el-button
                ><el-button
                  v-if="row.state === 'review' && canPublish"
                  size="small"
                  @click="action(row, 'return')"
                  >退回</el-button
                ><el-button
                  v-if="row.currentRevision && !row.withdrawn && canPublish"
                  size="small"
                  type="danger"
                  plain
                  @click="action(row, 'withdraw')"
                  >撤回</el-button
                >
              </div></template
            ></el-table-column
          ></el-table
        >
      </div>
      <div v-if="section === 'sources'" class="paper">
        <p class="muted">
          核查时间只在实际核对来源后标记；发布版本保留当时来源快照。
        </p>
        <el-table :data="sources"
          ><el-table-column label="原始来源" min-width="300"
            ><template #default="{ row }"
              ><div>{{ row.data.title }}</div>
              <a
                :href="row.data.url"
                target="_blank"
                rel="noopener noreferrer"
                class="muted"
                >{{ row.data.url }}</a
              ></template
            ></el-table-column
          ><el-table-column label="机构" min-width="150"
            ><template #default="{ row }">{{
              row.data.institution
            }}</template></el-table-column
          ><el-table-column label="核查" width="150"
            ><template #default="{ row }">{{
              row.data.verifiedAt?.slice(0, 10) || "待核查"
            }}</template></el-table-column
          ><el-table-column label="操作" width="90"
            ><template #default="{ row }"
              ><el-button size="small" @click="openSource(row.data)"
                >编辑</el-button
              ></template
            ></el-table-column
          ></el-table
        >
      </div>
      <div v-if="section === 'feedback'" class="paper">
        <el-table :data="feedback"
          ><el-table-column
            prop="message"
            label="用户反馈"
            min-width="300"
          /><el-table-column
            prop="contentId"
            label="关联内容"
            min-width="160"
          /><el-table-column
            prop="state"
            label="状态"
            width="110"
          /><el-table-column label="处理" width="130"
            ><template #default="{ row }"
              ><el-button
                v-if="row.state === 'open'"
                size="small"
                @click="
                  attempt(async () => {
                    await api('/feedback/' + row.id + '/resolve', 'POST');
                    await refresh();
                  })
                "
                >标记已处理</el-button
              ></template
            ></el-table-column
          ></el-table
        >
      </div>
      <div v-if="section === 'audit'" class="paper">
        <el-table :data="audit"
          ><el-table-column
            prop="actor"
            label="操作者"
            width="130" /><el-table-column
            prop="action"
            label="动作"
            width="190" /><el-table-column
            prop="entityId"
            label="关联对象"
            min-width="240" /><el-table-column
            prop="createdAt"
            label="时间"
            min-width="220"
        /></el-table>
      </div>
      <HomeSections ref="homeEditor" v-show="section === 'home'" :can-publish="['admin', 'reviewer'].includes(user.role)" />
      <TrainingCatalogEditor ref="trainingEditor" v-show="section === 'training'" :can-publish="['admin', 'reviewer'].includes(user.role)" />
      <InsurancePolicyEditor ref="insuranceEditor" v-show="section === 'insurance'" :can-publish="['admin', 'reviewer'].includes(user.role)" @saved="refreshInsuranceCities" />
      <BenefitPolicyEditor ref="benefitEditor" v-show="section === 'benefits'" :can-publish="['admin', 'reviewer'].includes(user.role)" />
      <div v-if="section === 'settings'" class="paper">
        <h3>暂停工具入口</h3>
        <p class="muted">选中的工具会暂停在线入口。本机已有数据保留。</p>
        <el-checkbox-group v-model="disabledTools"
          ><el-checkbox
            v-for="tool in tools"
            :key="tool.id"
            :label="tool.name"
            :value="tool.id" /></el-checkbox-group
        ><el-button
          type="primary"
          style="margin-top: 24px"
          @click="
            attempt(async () => {
              await api('/settings', 'PUT', { disabledTools });
              ElMessage.success('工具配置已保存');
            })
          "
          >保存配置</el-button
        >
      </div>
    </main>
  </div>
  <el-dialog
    v-model="editing"
    :title="editingId ? '编辑内容 · 草稿版本 ' + baseVersion : '新建内容'"
    width="92%"
    :close-on-click-modal="false"
    :destroy-on-close="false"
    ><el-form label-position="top"
      ><div class="editor">
        <el-form-item label="内容类型"
          ><el-select v-model="form.kind"
            ><el-option label="资讯文章" value="article" /><el-option
              label="行动指南"
              value="guide" /><el-option
              label="官方资源"
              value="resource" /></el-select></el-form-item
        ><el-form-item label="内容性质"
          ><el-select v-model="form.attribution"
            ><el-option
              label="编辑整理（非官方发文）"
              value="editorial" /><el-option
              label="政策解读（必须有来源）"
              value="policy_summary" /><el-option
              label="官方导航（必须有来源）"
              value="official_navigation" /></el-select></el-form-item
        ><el-form-item label="标题" class="span"
          ><el-input
            v-model="form.title"
            maxlength="120"
            show-word-limit /></el-form-item
        ><el-form-item label="摘要" class="span"
          ><el-input
            v-model="form.summary"
            type="textarea"
            :rows="2"
            maxlength="300"
            show-word-limit /></el-form-item
        ><el-form-item label="适用阶段"
          ><el-select v-model="form.stageKeys" multiple
            ><el-option
              v-for="s in stages"
              :key="s.key"
              :label="s.label"
              :value="s.key" /></el-select></el-form-item
        ><el-form-item label="问题分类"
          ><el-select v-model="form.issueKeys" multiple
            ><el-option
              v-for="i in issues"
              :key="i.key"
              :label="i.label"
              :value="i.key" /></el-select></el-form-item
        ><el-form-item label="地域范围"
          ><el-select
            v-model="form.scope"
            @change="
              form.regionIds = form.scope === 'national' ? [] : ['310000']
            "
            ><el-option
              label="全国通用（不含地方资格承诺）"
              value="national" /><el-option
              label="指定城市"
              value="specified_regions" /></el-select></el-form-item
        ><el-form-item v-if="form.scope === 'specified_regions'" label="适用城市"><el-select v-model="form.regionIds" multiple><el-option v-for="city in insuranceCities" :key="city.cityId" :value="city.cityId" :label="city.cityName" /></el-select></el-form-item
        ><el-form-item label="下次人工复核日期"
          ><el-date-picker
            v-model="form.reviewDueAt"
            type="date"
            value-format="YYYY-MM-DD" /></el-form-item
        ><el-form-item label="生效日（可选）"
          ><el-date-picker
            v-model="form.effectiveFrom"
            type="date"
            value-format="YYYY-MM-DD" /></el-form-item
        ><el-form-item label="失效日（可选）"
          ><el-date-picker
            v-model="form.effectiveTo"
            type="date"
            value-format="YYYY-MM-DD" /></el-form-item
        ><el-form-item label="文章要点（每行一条，最多五条）" class="span"
          ><el-input
            v-model="keyPointsText"
            type="textarea"
            :rows="3" /></el-form-item
        ><el-form-item label="原始来源（先在资料来源中添加并核查）" class="span"
          ><el-select v-model="sourceIds" multiple
            ><el-option
              v-for="source in sources"
              :key="source.id"
              :label="
                source.data.title +
                (source.data.verifiedAt ? ' · 已核查' : ' · 待核查')
              "
              :value="source.id" /></el-select></el-form-item
        ><el-form-item
          label="正文 Markdown（支持段落、标题、列表、引用；不支持 HTML、图片及链接语法）"
          class="span"
          ><el-input
            v-model="form.markdown"
            type="textarea"
            :rows="13" /></el-form-item
        ><el-form-item
          v-if="form.kind === 'resource'"
          label="官方渠道 HTTPS 链接"
          class="span"
          ><el-input v-model="form.resourceUrl"
        /></el-form-item>
        <div v-if="form.kind === 'guide'" class="span">
          <div>行动清单</div>
          <div
            v-for="(task, i) in form.tasks"
            :key="task.key"
            class="task-editor"
          >
            <el-input
              v-model="task.title"
              placeholder="事项标题"
              maxlength="140"
            /><el-input
              v-model="task.note"
              placeholder="准备说明"
              style="margin-top: 8px"
              maxlength="500"
            /><el-button link type="danger" @click="form.tasks.splice(i, 1)"
              >删除事项</el-button
            >
          </div>
          <el-button
            @click="
              form.tasks.push({
                key: 'task-' + Date.now().toString(36),
                title: '',
                note: '',
              })
            "
            >添加事项</el-button
          >
        </div>
      </div></el-form
    ><el-alert
      v-if="editorError"
      :title="editorError"
      type="error"
      :closable="false"
      style="margin: 16px 0"
    />
    <div v-if="preview.length" class="preview">
      <h2>{{ form.title }}</h2>
      <p>{{ form.summary }}</p>
      <template v-for="(block, i) in preview" :key="i"
        ><h3 v-if="block.type === 'heading'">{{ block.text }}</h3>
        <ul v-else-if="block.type === 'list'">
          <li v-for="item in block.items" :key="item">{{ item }}</li>
        </ul>
        <p v-else>{{ block.text }}</p></template
      >
    </div>
    <template #footer
      ><el-button @click="editing = false">关闭</el-button
      ><el-button @click="showPreview">校验并预览</el-button
      ><el-button type="primary" :loading="busy" @click="save"
        >保存草稿</el-button
      ></template
    ></el-dialog
  >
  <el-dialog v-model="sourceDialog" title="资料来源" width="650px"
    ><el-form label-position="top"
      ><el-form-item label="来源标题"
        ><el-input v-model="sourceForm.title" /></el-form-item
      ><el-form-item label="发布机构"
        ><el-input v-model="sourceForm.institution" /></el-form-item
      ><el-form-item label="官方 HTTPS 链接"
        ><el-input v-model="sourceForm.url" /></el-form-item
      ><el-form-item label="原文发布日期（如未提供，可留空）"
        ><el-date-picker
          v-model="sourceForm.publishedAt"
          type="date"
          value-format="YYYY-MM-DD" /></el-form-item
      ><el-checkbox v-model="sourceVerified"
        >我已人工核对原文内容及适用范围</el-checkbox
      ></el-form
    ><template #footer
      ><el-button @click="sourceDialog = false">取消</el-button
      ><el-button type="primary" :loading="busy" @click="saveSource"
        >保存来源</el-button
      ></template
    ></el-dialog
  >
</template>
