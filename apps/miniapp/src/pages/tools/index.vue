<script setup lang="ts">
import { onShow } from "@dcloudio/uni-app";
import { useCatalog } from "../../stores/catalog";
import TopBar from "../../components/TopBar.vue";
import BlueIcon from "../../components/BlueIcon.vue";
import { go } from "../../services/navigation";
const catalog = useCatalog();
onShow(() => void catalog.refresh());
const cards = [
  {
    name: "失业金金额试算",
    description: "按核定月数算清剩余金额",
    icon: "budget",
    tone: "orange",
    path: "/package-tools/benefit/index",
    id: "benefit-calculator",
  },
  {
    name: "生活预算测算",
    description: "算清收支与可支撑时间",
    icon: "budget",
    tone: "blue",
    path: "/package-tools/budget/index",
    id: "budget",
  },
  {
    name: "社保医保指南",
    description: "断缴、衔接与官方渠道",
    icon: "insurance",
    tone: "green",
    path: "/package-insurance/home/index",
  },
  {
    name: "离职权益清单",
    description: "材料准备与权益问题核对",
    icon: "rights",
    tone: "violet",
    path: "/pages/guide/detail?id=guide-preparing",
  },
  {
    name: "培训补贴信息",
    description: "考证、培训与费用核对",
    icon: "training",
    tone: "violet",
    path: "/package-training/home/index",
  },
  {
    name: "常用办事入口",
    description: "官方办理渠道汇总",
    icon: "link",
    tone: "blue",
    path: "/pages/resources/index",
    id: "resources",
  },
  {
    name: "求职进度记录",
    description: "投递、面试、跟进不遗漏",
    icon: "jobs",
    tone: "teal",
    path: "/package-records/applications/index",
    id: "applications",
  },
  {
    name: "我的行动清单",
    description: "离职到入职，逐项推进",
    icon: "check",
    tone: "pink",
    path: "/package-records/tasks/index",
    id: "tasks",
  },
];
</script>
<template>
  <view class="tools-view"
    ><TopBar title="实用工具" subtitle="让复杂的政策变简单" /><view
      class="tools-grid"
      ><button
        v-for="card in cards.filter(
          (c) => !c.id || catalog.available.includes(c.id),
        )"
        :key="card.name"
        class="tool-card"
        :class="'wash-' + card.tone"
        @tap="go(card.path)"
      >
        <BlueIcon :name="card.icon" :tone="card.tone" :size="40" /><view
          class="tool-name"
          >{{ card.name }}</view
        ><view class="tool-description">{{ card.description }}</view
        ><text class="tool-chevron">›</text>
      </button></view
    ><view v-if="catalog.error" class="notice" style="margin: 18px">{{
      catalog.error
    }}</view></view
  >
</template>
<style scoped>
.tools-view {
  max-width: 560px;
  margin: auto;
  min-height: 100vh;
  background: linear-gradient(150deg, #dfedff 0, #f6f8fc 230px);
}
.tools-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  padding: 10px 14px;
}
.tool-card {
  width: 100%;
  position: relative;
  text-align: left;
  background: #fff;
  border: 5px solid #fff;
  border-radius: 14px;
  padding: 17px 12px 18px;
  min-height: 153px;
  box-shadow: 0 4px 16px #5984b507;
}
.wash-orange {
  background: linear-gradient(130deg, #fff, #fff4ec);
}
.wash-blue {
  background: linear-gradient(130deg, #fff, #edf5ff);
}
.wash-green,
.wash-teal {
  background: linear-gradient(130deg, #fff, #eafff9);
}
.wash-violet {
  background: linear-gradient(130deg, #fff, #f6efff);
}
.wash-pink {
  background: linear-gradient(130deg, #fff, #fff0f7);
}
.tool-name {
  font-size: 15px;
  font-weight: 600;
  line-height: 1.5;
  margin-top: 13px;
  color: #29334b;
}
.tool-description {
  font-size: 10px;
  color: #8f99ad;
  line-height: 1.6;
  margin-top: 4px;
  padding-right: 5px;
}
.tool-chevron {
  position: absolute;
  right: 7px;
  bottom: 15px;
  color: #397dff;
  font-size: 22px;
  font-weight: 300;
}
</style>
