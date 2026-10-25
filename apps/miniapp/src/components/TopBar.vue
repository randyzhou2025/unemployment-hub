<script setup lang="ts">
const props = defineProps<{
  title?: string;
  subtitle?: string;
  home?: boolean;
}>();
let top = 18;
let native = false;
// #ifdef MP-WEIXIN
native = true;
top = (uni.getSystemInfoSync().statusBarHeight || 20) + 8;
// #endif
</script>
<template>
  <view
    class="topbar"
    :class="{ native, 'brand-header': props.home }"
    :style="{ paddingTop: top + 'px' }"
    ><view class="top-main"
      ><image
        v-if="props.home"
        class="brand-icon"
        src="/static/blue/brand.png" /><view class="title-block"
        ><view class="top-title">{{ props.title || "失业有数" }}</view
        ><view v-if="props.subtitle" class="top-subtitle">{{
          props.subtitle
        }}</view></view
      ><view
        class="top-slot"
        :style="native && props.home ? { top: top + 42 + 'px' } : {}"
        ><slot /></view></view
  ></view>
</template>
<style scoped>
.topbar {
  padding: 18px 18px 12px;
  position: relative;
  z-index: 2;
}
.top-main {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 38px;
}
.brand-icon {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
}
.top-title {
  font-size: 22px;
  font-weight: 650;
  line-height: 1.35;
  letter-spacing: -0.4px;
  color: #17243d;
}
.top-subtitle {
  font-size: 12px;
  line-height: 1.7;
  color: #77839b;
  margin-top: 2px;
}
.top-slot {
  margin-left: auto;
  flex-shrink: 0;
}
.native:not(.brand-header) .top-main {
  padding-right: 95px;
}
.native.brand-header .top-slot {
  position: absolute;
  right: 18px;
}
.native.brand-header .top-subtitle {
  font-size: 11px;
}
.native.brand-header .title-block {
  max-width: calc(100% - 90px);
}
</style>
