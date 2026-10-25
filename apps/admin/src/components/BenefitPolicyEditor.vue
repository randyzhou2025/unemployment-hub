<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { ElMessage } from "element-plus";
import { benefitPolicySchema, type BenefitPolicy } from "@uh/contracts";
import { api } from "../api";
const props = defineProps<{ canPublish: boolean }>();
const form = ref<BenefitPolicy | null>(null),
  saved = ref(""),
  busy = ref(false),
  error = ref("");
const dirty = computed(() => JSON.stringify(form.value) !== saved.value);
const amountFields = [
  { key: "firstYearMonthlyCents", label: "第1–12个月（元/月）" },
  { key: "secondYearMonthlyCents", label: "第13–24个月（元/月）" },
  { key: "extensionMonthlyCents", label: "符合条件的延长领取（元/月）" },
] as const;
const dateFields = [
  { key: "effectiveFrom", label: "金额标准生效日期" },
  { key: "effectiveTo", label: "金额标准文件有效期截止" },
  { key: "rulesEffectiveFrom", label: "申领办法生效日期" },
  { key: "rulesEffectiveTo", label: "申领办法有效期截止" },
  { key: "verifiedOn", label: "最近实际核查日期" },
  { key: "reviewDueAt", label: "下次复核日期" },
] as const;
async function load() {
  if (form.value && dirty.value) {
    ElMessage.warning("有未发布修改，请先保存后再刷新");
    return;
  }
  try {
    form.value = await api<BenefitPolicy>("/benefit-policy");
    saved.value = JSON.stringify(form.value);
    error.value = "";
  } catch (e) {
    error.value = (e as Error).message;
  }
}
onMounted(load);
defineExpose({ reload: load });
function move(index: number, delta: number) {
  if (!form.value) return;
  const item = form.value.items.splice(index, 1)[0];
  form.value.items.splice(index + delta, 0, item);
}
function setAmount(
  key: (typeof amountFields)[number]["key"],
  value: number | undefined,
) {
  if (form.value) form.value[key] = Math.round(Number(value) * 100);
}
async function save() {
  const result = benefitPolicySchema.safeParse(form.value);
  if (!result.success) {
    error.value = result.error.issues
      .map((i) => i.path.join(".") + "：" + i.message)
      .join("；");
    return;
  }
  busy.value = true;
  try {
    form.value = await api<BenefitPolicy>(
      "/benefit-policy",
      "PUT",
      result.data,
    );
    saved.value = JSON.stringify(form.value);
    error.value = "";
    ElMessage.success("失业金政策数据已发布");
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <div class="paper">
    <h3>上海 · 失业金政策</h3>
    <p class="muted">
      管理专题顶部数据与核心条目。相关资讯仍在“内容与指南”中发布，选择“失业待遇”分类及适用地区即可归集。
    </p>
    <el-alert v-if="error" :title="error" type="error" :closable="false" />
    <el-form v-if="form" label-position="top" :disabled="!props.canPublish">
      <el-form-item label="专题标题"
        ><el-input v-model="form.title" :maxlength="40"
      /></el-form-item>
      <h4>核心数据</h4>
      <div class="editor">
        <el-form-item
          v-for="field in amountFields"
          :key="field.key"
          :label="field.label"
          ><el-input-number
            :model-value="form[field.key] / 100"
            :min="0.01"
            :max="100000"
            :precision="2"
            @update:model-value="
              (v: number | undefined) => setAmount(field.key, v)
            "
        /></el-form-item>
        <el-form-item label="一次核定最长期限"
          ><el-input model-value="24个月（现行上海规则）" disabled
        /></el-form-item>
        <el-form-item
          v-for="field in dateFields"
          :key="field.key"
          :label="field.label"
          ><el-date-picker
            v-model="form[field.key]"
            type="date"
            value-format="YYYY-MM-DD"
            :clearable="false"
        /></el-form-item>
      </div>
      <p class="muted">
        到期或超过复核日期后，小程序会标注状态并暂停金额试算。核查日期应反映实际核查，不会因保存或部署自动更新。
      </p>
      <h4>核心政策条目</h4>
      <div v-for="(item, index) in form.items" :key="index" class="policy-item">
        <div class="item-order">
          <span>{{ index + 1 }}</span
          ><el-button
            size="small"
            :disabled="index === 0"
            @click="move(index, -1)"
            >上移</el-button
          ><el-button
            size="small"
            :disabled="index === form.items.length - 1"
            @click="move(index, 1)"
            >下移</el-button
          ><el-button
            size="small"
            type="danger"
            plain
            @click="form.items.splice(index, 1)"
            >移除</el-button
          >
        </div>
        <el-input
          v-model="item.title"
          placeholder="条目标题"
          :maxlength="30"
        /><el-input
          v-model="item.text"
          type="textarea"
          :autosize="{ minRows: 2, maxRows: 5 }"
          placeholder="用简明语言概括适用条件和例外"
          :maxlength="300"
          show-word-limit
          style="margin-top: 8px"
        />
      </div>
      <el-button
        :disabled="form.items.length >= 12"
        @click="form.items.push({ title: '', text: '' })"
        >增加政策条目</el-button
      >
      <h4>官方原文来源</h4>
      <div
        v-for="(source, index) in form.sources"
        :key="source.id"
        class="policy-item"
      >
        <el-form-item label="文件名称"
          ><el-input v-model="source.title" :maxlength="240"
        /></el-form-item>
        <el-form-item label="发布机构"
          ><el-input v-model="source.institution" :maxlength="100"
        /></el-form-item>
        <el-form-item label="官方原文链接（HTTPS）"
          ><el-input v-model="source.url"
        /></el-form-item>
        <el-form-item label="文件发布日期"
          ><el-date-picker
            v-model="source.publishedAt"
            type="date"
            value-format="YYYY-MM-DD"
            :clearable="false"
        /></el-form-item>
        <el-button
          type="danger"
          plain
          :disabled="form.sources.length <= 2"
          @click="form.sources.splice(index, 1)"
          >移除此来源</el-button
        >
      </div>
      <el-button
        :disabled="form.sources.length >= 6"
        @click="
          form.sources.push({
            id: 'source-' + Date.now().toString(36),
            title: '',
            institution: '',
            url: '',
            publishedAt: null,
            verifiedAt: null,
          })
        "
        >增加原文来源</el-button
      >
      <div class="publish-row">
        <span v-if="dirty" class="unsaved">有修改待发布</span
        ><el-button
          type="primary"
          :disabled="!dirty"
          :loading="busy"
          @click="save"
          >保存并发布政策</el-button
        >
      </div>
    </el-form>
  </div>
</template>
<style scoped>
h3 {
  margin: 0;
}
h4 {
  margin: 26px 0 16px;
}
.policy-item {
  padding: 16px;
  border: 1px solid #e6edf8;
  border-radius: 10px;
  margin-bottom: 12px;
}
.item-order {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.item-order span {
  margin-right: auto;
  color: #7b90ae;
}
.publish-row {
  position: sticky;
  bottom: 0;
  background: #fffffff2;
  border-top: 1px solid #e6edf8;
  padding: 18px 0 0;
  margin-top: 24px;
  text-align: right;
}
.unsaved {
  color: #b07825;
  margin-right: 16px;
  font-size: 13px;
}
</style>
