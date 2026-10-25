import { defineStore } from "pinia";
import { ref } from "vue";
import { tools, defaultHomeSections } from "@uh/domain";
import { homeSectionsSchema, type HomeSection } from "@uh/contracts";
import { request } from "../services/http";
import { storage } from "../services/storage";
import { readLocal, saveLocal } from "../services/storage-core";
export const useCatalog = defineStore("catalog", () => {
  const available = ref<string[]>(tools.map((t) => t.id));
  const error = ref("");
  const cached = readLocal(
    storage,
    "uhb:v1:home-sections",
    (v): v is HomeSection[] => homeSectionsSchema.safeParse(v).success,
  );
  const homeSections = ref<HomeSection[]>(cached ?? []);
  let hasHomeConfig = cached !== null;
  async function refreshHome() {
    try {
      homeSections.value = homeSectionsSchema.parse(
        await request("/api/v1/home-sections"),
      );
      hasHomeConfig = true;
      saveLocal(storage, "uhb:v1:home-sections", homeSections.value);
    } catch {
      if (!hasHomeConfig)
        homeSections.value = defaultHomeSections.map((s) => ({ ...s }));
    }
  }
  async function refresh() {
    try {
      const list = await request<{ id: string }[]>("/api/v1/tools");
      available.value = list.map((t) => t.id);
      error.value = "";
    } catch {
      error.value = "网络连接异常，请稍后重试。";
    }
  }
  return { available, error, refresh, homeSections, refreshHome };
});
