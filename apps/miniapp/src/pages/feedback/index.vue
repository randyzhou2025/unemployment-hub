<script setup lang="ts">
import { back } from "../../services/navigation";
import { ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { request } from "../../services/http";
const contentId = ref(""),
  message = ref(""),
  sending = ref(false),
  error = ref(""),
  done = ref(false);
onLoad((q) => {
  contentId.value = String(q?.id || "");
});
async function submit() {
  if (message.value.trim().length < 5) {
    error.value = "请至少填写 5 个字，说明具体问题";
    return;
  }
  sending.value = true;
  error.value = "";
  try {
    await request("/api/v1/feedback", "POST", {
      contentId: contentId.value || undefined,
      message: message.value.trim(),
    });
    done.value = true;
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    sending.value = false;
  }
}
</script>
<template>
  <view class="page"
    ><text class="kicker">WE ARE LISTENING</text
    ><view class="page-title">让信息更准确。</view
    ><view v-if="done" class="card section"
      ><view class="section-title">反馈已收到</view
      ><view class="subtitle">谢谢反馈，我们会尽快处理。</view
      ><button class="secondary section" @tap="back()">返回</button></view
    ><template v-else
      ><view class="subtitle section"
        >描述遇到的问题或需要更正的地方，请勿填写身份证、银行卡或其他敏感信息。</view
      ><textarea
        v-model="message"
        class="input section"
        style="height: 190px"
        maxlength="2000"
        placeholder="哪一处不清楚，或与你查到的官方信息不一致？"
      /><view v-if="error" class="notice warning section">{{ error }}</view
      ><button class="primary section" :disabled="sending" @tap="submit">
        {{ sending ? "正在提交…" : "提交反馈" }}
      </button></template
    ></view
  >
</template>
