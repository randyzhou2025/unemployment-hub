<script setup lang="ts">
const props = defineProps<{ name: string; tone?: string; size?: number }>();
</script>
<template>
  <view
    class="blue-icon"
    :class="'tone-' + (props.tone || 'blue')"
    :style="{
      width: (props.size || 40) + 'px',
      height: (props.size || 40) + 'px',
    }"
    ><image :src="'/static/blue/' + props.name + '.png'" mode="aspectFit"
  /></view>
</template>
<style scoped>
.blue-icon {
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow:
    inset 0 1px 2px #ffffff90,
    0 5px 12px #3273dc15;
  flex-shrink: 0;
}
.blue-icon image {
  width: 65%;
  height: 65%;
}
.tone-blue {
  background: linear-gradient(145deg, #70b0ff, #2874ff);
}
.tone-green {
  background: linear-gradient(145deg, #57e6c7, #12b991);
}
.tone-orange {
  background: linear-gradient(145deg, #ffb17c, #ff7049);
}
.tone-violet {
  background: linear-gradient(145deg, #a3acff, #6879ff);
}
.tone-teal {
  background: linear-gradient(145deg, #73e3d6, #24bea9);
}
.tone-pink {
  background: linear-gradient(145deg, #ff92bb, #f6468d);
}
</style>
