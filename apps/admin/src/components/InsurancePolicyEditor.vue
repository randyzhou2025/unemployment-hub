<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  insurancePolicySchema,
  insuranceRouteIds,
  type InsurancePolicy,
  type InsuranceRecord,
} from "@uh/contracts";
import { api } from "../api";
const props = defineProps<{ canPublish: boolean }>();
const emit = defineEmits<{ saved: [] }>();
const records = ref<InsuranceRecord[]>([]),
  form = ref<InsurancePolicy | null>(null),
  selected = ref("310000"),
  saved = ref(""),
  busy = ref(false),
  error = ref(""),
  reviewed = ref(false),
  tab = ref("amounts");
const dirty = computed(() => JSON.stringify(form.value) !== saved.value);
const parameters = [
  { key: "base", label: "月缴费基数（元）" },
  { key: "pension", label: "养老缴费比例（%）" },
  { key: "medical", label: "医保缴费比例（%，含生育）" },
  { key: "account", label: "个人账户计入比例（%）" },
  { key: "resident", label: "居民医保指定年龄档（元/年）" },
  { key: "rules", label: "参保规则总有效期" },
] as const;
const textRules = [
  { key: "flexEligibility", label: "灵活就业资格说明" },
  { key: "residentEligibility", label: "居民医保资格与户籍说明" },
  { key: "waiting", label: "职工与居民医保等待期 / 衔接例外" },
  { key: "account", label: "个人账户计入与清算说明" },
  { key: "retirement", label: "临近退休专项支持与限制" },
] as const;
async function load() {
  if (form.value && dirty.value) {
    ElMessage.warning("有未保存修改，请先保存草稿");
    return;
  }
  try {
    records.value = await api<InsuranceRecord[]>("/insurance-policies");
    select(selected.value);
  } catch (e) {
    error.value = (e as Error).message;
  }
}
function select(id: string) {
  if (form.value && dirty.value) {
    ElMessage.warning("请先保存当前城市草稿");
    return;
  }
  const row =
    records.value.find((r) => r.draft.cityId === id) || records.value[0];
  if (row) {
    selected.value = row.draft.cityId;
    form.value = JSON.parse(JSON.stringify(row.draft));
    saved.value = JSON.stringify(form.value);
    reviewed.value = false;
    error.value = "";
  }
}
function create() {
  if (dirty.value) {
    ElMessage.warning("请先保存当前草稿");
    return;
  }
  const period = { from: "", to: null, sourceId: "policy" };
  form.value = {
    cityId: "",
    cityName: "",
    enabled: false,
    verifiedOn: "",
    reviewDueAt: "",
    base: { ...period, minCents: 0, maxCents: 0 },
    pension: { ...period, bps: 0 },
    medical: { ...period, bps: 0 },
    account: { ...period, bps: 0 },
    resident: {
      ...period,
      year: new Date().getFullYear(),
      annualCents: 0,
      ageLabel: "",
    },
    rules: {
      ...period,
      residentCandidates: [],
      benefitMedicalFunded: false,
      receivingPensionAllowed: false,
      flexMedicalOnly: "confirm",
      flexEligibility: "",
      residentEligibility: "",
      waiting: "",
      account: "",
      retirement: "",
    },
    paths: insuranceRouteIds.map((id, i) => ({
      id,
      title: [
        "领金期间医保",
        "领金与个人养老",
        "灵活就业参保",
        "居民保障",
        "单位参保",
      ][i],
      subtitle: "",
      medical: "",
      pension: "",
      conditions: [""],
      steps: [""],
      sourceIds: ["policy"],
    })),
    sources: [{ id: "policy", title: "", url: "", institution: "" }],
  };
  selected.value = "";
  saved.value = "";
  reviewed.value = false;
  error.value = "";
  tab.value = "amounts";
}
async function save(publish: boolean) {
  if (
    !selected.value &&
    records.value.some((r) => r.draft.cityId === form.value?.cityId)
  ) {
    error.value = "该城市代码已存在，请取消新增后选择现有城市编辑";
    return;
  }
  const result = insurancePolicySchema.safeParse(form.value);
  if (!result.success) {
    error.value = result.error.issues
      .map((i) => i.path.join(".") + "：" + i.message)
      .join("；");
    return;
  }
  if (publish && !reviewed.value) return;
  busy.value = true;
  try {
    await api("/insurance-policies/" + result.data.cityId, "PUT", {
      policy: result.data,
      publish,
    });
    form.value = result.data;
    saved.value = JSON.stringify(result.data);
    selected.value = result.data.cityId;
    reviewed.value = false;
    error.value = "";
    await load();
    emit("saved");
    ElMessage.success(
      publish
        ? "城市政策已发布，前台按开放开关生效"
        : "草稿已保存，前台版本未改变",
    );
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
async function discard() {
  try {
    await ElMessageBox.confirm(
      "放弃尚未保存的修改？已保存草稿与已发布版本不会改变。",
      "放弃修改",
      {
        type: "warning",
        confirmButtonText: "放弃修改",
        cancelButtonText: "继续编辑",
      },
    );
    form.value = null;
    saved.value = "";
    select(selected.value);
  } catch {
    /* 继续保留当前表单 */
  }
}
function amount(
  key: "base" | "resident",
  value: number | undefined,
  field: "minCents" | "maxCents" | "annualCents",
) {
  if (form.value)
    Object.assign(form.value[key], {
      [field]: Math.round(Number(value) * 100),
    });
}
function rate(
  key: "pension" | "medical" | "account",
  value: number | undefined,
) {
  if (form.value) form.value[key].bps = Math.round(Number(value) * 100);
}
function lines(value: string) {
  return value
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}
onMounted(load);
defineExpose({ reload: load });
</script>
<template>
  <div class="paper insurance-editor">
    <div class="insurance-toolbar">
      <div>
        <h3>社保医保 · 城市政策工作台</h3>
        <p class="muted">
          维护本地资格、基数、费率、办理步骤和原文；草稿与已发布版本分离。
        </p>
      </div>
      <el-button :disabled="!props.canPublish" @click="create"
        >新增城市</el-button
      >
    </div>
    <el-select
      :model-value="selected"
      placeholder="新城市草稿"
      style="width: 300px"
      @update:model-value="select"
      ><el-option
        v-for="r in records"
        :key="r.draft.cityId"
        :value="r.draft.cityId"
        :label="
          r.draft.cityName +
          ' · ' +
          (r.published?.enabled ? '已开放' : r.published ? '已停用' : '未发布')
        " /></el-select
    ><el-alert
      v-if="error"
      :title="error"
      type="error"
      :closable="false"
      style="margin-top: 16px"
    /><el-form
      v-if="form"
      label-position="top"
      :disabled="!props.canPublish"
      style="margin-top: 20px"
      ><div class="editor">
        <el-form-item label="城市行政区划代码（六位，保存后不可更改）"
          ><el-input
            v-model="form.cityId"
            :disabled="!!records.find((r) => r.draft.cityId === selected)"
            maxlength="6" /></el-form-item
        ><el-form-item label="城市名称"
          ><el-input v-model="form.cityName" maxlength="16" /></el-form-item
        ><el-form-item label="发布后是否在前台开放"
          ><el-switch
            v-model="form.enabled"
            active-text="开放"
            inactive-text="停用" /></el-form-item
        ><el-form-item label="实际核查日期"
          ><el-date-picker
            v-model="form.verifiedOn"
            type="date"
            value-format="YYYY-MM-DD" /></el-form-item
        ><el-form-item label="下次人工复核日期"
          ><el-date-picker
            v-model="form.reviewDueAt"
            type="date"
            value-format="YYYY-MM-DD"
        /></el-form-item>
      </div>
      <el-tabs v-model="tab"
        ><el-tab-pane label="费用与有效期" name="amounts"
          ><p class="muted">
            金额在界面以元编辑，存储为整数分。每项独立有效期；未载明截止日期可留空。居民年费必须注明年份及年龄档，不可当下一年度报价。
          </p>
          <div
            v-for="parameter in parameters"
            :key="parameter.key"
            class="policy-block"
          >
            <h4>{{ parameter.label }}</h4>
            <div class="editor">
              <template v-if="parameter.key === 'base'"
                ><el-form-item label="最低月基数（元）"
                  ><el-input-number
                    :model-value="
                      form.base.minCents ? form.base.minCents / 100 : undefined
                    "
                    :min="0.01"
                    :precision="2"
                    @update:model-value="
                      (v: number | undefined) => amount('base', v, 'minCents')
                    " /></el-form-item
                ><el-form-item label="最高月基数（元）"
                  ><el-input-number
                    :model-value="
                      form.base.maxCents ? form.base.maxCents / 100 : undefined
                    "
                    :min="0.01"
                    :precision="2"
                    @update:model-value="
                      (v: number | undefined) => amount('base', v, 'maxCents')
                    " /></el-form-item></template
              ><el-form-item
                v-if="['pension', 'medical', 'account'].includes(parameter.key)"
                label="比例（输入20代表20%）"
                ><el-input-number
                  :model-value="
                    (form[parameter.key] as { bps: number }).bps / 100
                  "
                  :min="0"
                  :max="100"
                  :precision="2"
                  @update:model-value="
                    (v: number | undefined) =>
                      rate(
                        parameter.key as 'pension' | 'medical' | 'account',
                        v,
                      )
                  " /></el-form-item
              ><template v-if="parameter.key === 'resident'"
                ><el-form-item label="个人医保年费（元）"
                  ><el-input-number
                    :model-value="
                      form.resident.annualCents
                        ? form.resident.annualCents / 100
                        : undefined
                    "
                    :min="0.01"
                    :precision="2"
                    @update:model-value="
                      (v: number | undefined) =>
                        amount('resident', v, 'annualCents')
                    " /></el-form-item
                ><el-form-item label="待遇年度"
                  ><el-input-number
                    v-model="form.resident.year"
                    :min="2026"
                    :max="2100" /></el-form-item
                ><el-form-item label="适用年龄 / 身份档"
                  ><el-input
                    v-model="form.resident.ageLabel"
                    placeholder="例如：超过18周岁、不满60周岁" /></el-form-item></template
              ><el-form-item label="生效日期"
                ><el-date-picker
                  v-model="form[parameter.key].from"
                  type="date"
                  value-format="YYYY-MM-DD" /></el-form-item
              ><el-form-item label="截止日期（官方未载明可留空）"
                ><el-date-picker
                  v-model="form[parameter.key].to"
                  type="date"
                  value-format="YYYY-MM-DD"
                  @clear="form[parameter.key].to = null" /></el-form-item
              ><el-form-item label="官方依据"
                ><el-select v-model="form[parameter.key].sourceId"
                  ><el-option
                    v-for="s in form.sources"
                    :key="s.id"
                    :label="s.title || s.id"
                    :value="s.id" /></el-select
              ></el-form-item>
            </div></div></el-tab-pane
        ><el-tab-pane label="资格、路径与办理" name="rules"
          ><el-alert
            title="只有核对本地官方政策后，才可开启下列规则；不可复制上海金额与条件作为新城市政策。"
            type="info"
            :closable="false" />
          <div class="editor" style="margin-top: 20px">
            <el-form-item label="领金期间本地医保由基金代缴"
              ><el-switch
                v-model="form.rules.benefitMedicalFunded" /></el-form-item
            ><el-form-item label="本地领金期间支持个人续缴养老"
              ><el-switch
                v-model="form.rules.receivingPensionAllowed" /></el-form-item
            ><el-form-item label="居民医保可初步考虑的类别（仍须核实完整资格）"
              ><el-select v-model="form.rules.residentCandidates" multiple
                ><el-option value="local" label="本地户籍" /><el-option
                  value="nonlocal"
                  label="外地户籍" /><el-option
                  value="permit"
                  label="外地户籍有居住证" /></el-select></el-form-item
            ><el-form-item label="灵活就业仅缴职工医保"
              ><el-select v-model="form.rules.flexMedicalOnly"
                ><el-option
                  value="confirm"
                  label="需经办确认，不作承诺" /><el-option
                  value="supported"
                  label="本地政策支持（仍需核对资格）" /></el-select
            ></el-form-item>
          </div>
          <el-form-item v-for="r in textRules" :key="r.key" :label="r.label"
            ><el-input
              v-model="form.rules[r.key]"
              type="textarea"
              :rows="3"
              maxlength="500"
              show-word-limit
          /></el-form-item>
          <div v-for="path in form.paths" :key="path.id" class="policy-block">
            <h4>{{ path.id }}</h4>
            <div class="editor">
              <el-form-item label="路径名称"
                ><el-input v-model="path.title" maxlength="30" /></el-form-item
              ><el-form-item label="一句话介绍"
                ><el-input v-model="path.subtitle" maxlength="500"
              /></el-form-item>
            </div>
            <el-form-item label="医保怎么缴"
              ><el-input
                v-model="path.medical"
                type="textarea"
                :rows="2" /></el-form-item
            ><el-form-item label="养老怎么缴"
              ><el-input v-model="path.pension" type="textarea" :rows="2"
            /></el-form-item>
            <div class="editor">
              <el-form-item label="适用条件（每行一条，最多6条）"
                ><el-input
                  :model-value="path.conditions.join('\n')"
                  type="textarea"
                  :rows="4"
                  @update:model-value="
                    (v: string) => (path.conditions = lines(v))
                  " /></el-form-item
              ><el-form-item label="办理步骤及官方入口名称（每行一条，最多6条）"
                ><el-input
                  :model-value="path.steps.join('\n')"
                  type="textarea"
                  :rows="4"
                  @update:model-value="(v: string) => (path.steps = lines(v))"
              /></el-form-item>
            </div>
            <el-form-item label="原文来源"
              ><el-select v-model="path.sourceIds" multiple
                ><el-option
                  v-for="s in form.sources"
                  :key="s.id"
                  :value="s.id"
                  :label="s.title || s.id" /></el-select
            ></el-form-item></div></el-tab-pane
        ><el-tab-pane label="官方来源" name="sources"
          ><div
            v-for="(s, index) in form.sources"
            :key="index"
            class="policy-block"
          >
            <div class="editor">
              <el-form-item label="来源标识（小写字母数字短横线）"
                ><el-input v-model="s.id" /></el-form-item
              ><el-form-item label="原文标题 / 文号"
                ><el-input v-model="s.title" /></el-form-item
              ><el-form-item label="发布机构"
                ><el-input v-model="s.institution" /></el-form-item
              ><el-form-item label="官方HTTPS原文网址"
                ><el-input v-model="s.url"
              /></el-form-item>
            </div>
            <el-button
              type="danger"
              plain
              @click="form.sources.splice(index, 1)"
              >移除来源</el-button
            >
          </div>
          <el-button
            :disabled="form.sources.length >= 20"
            @click="
              form.sources.push({
                id: 'source-' + Date.now().toString(36),
                title: '',
                url: '',
                institution: '',
              })
            "
            >新增官方来源</el-button
          ></el-tab-pane
        ></el-tabs
      >
      <div class="insurance-publish">
        <el-checkbox v-model="reviewed"
          >已逐项核查本地资格、费用、有效期及官方来源，同意发布当前版本</el-checkbox
        >
        <div>
          <span v-if="dirty" class="unsaved">有未保存修改</span
          ><el-button v-if="dirty" @click="discard">放弃修改</el-button>
          <el-button :loading="busy" @click="save(false)">保存草稿</el-button
          ><el-button
            type="primary"
            :disabled="!reviewed"
            :loading="busy"
            @click="save(true)"
            >发布城市政策</el-button
          >
        </div>
        <p class="muted">
          停用城市：关闭“前台开放”后发布。草稿需填写完整；发布前不会出现在前台。到期参数暂停精确报价。
        </p>
      </div></el-form
    >
  </div>
</template>
<style scoped>
.insurance-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}
.policy-block {
  border: 1px solid #e4eaf2;
  background: #fafcff;
  border-radius: 12px;
  padding: 18px;
  margin: 16px 0;
}
.policy-block h4 {
  margin: 0 0 16px;
}
.insurance-publish {
  border-top: 1px solid #e4eaf2;
  padding-top: 20px;
  margin-top: 20px;
}
.insurance-publish > div {
  margin-top: 14px;
}
.unsaved {
  color: #bf7a16;
  margin-right: 16px;
}
.insurance-editor :deep(.el-select) {
  width: 100%;
}
</style>
