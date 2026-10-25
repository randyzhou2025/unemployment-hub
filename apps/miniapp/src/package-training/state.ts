import { ref, computed } from "vue";
import { onShow } from "@dcloudio/uni-app";
import type { TrainingCatalog } from "@uh/contracts";
import { trainingCurrent } from "@uh/tool-core";
import { request } from "../services/http";
export const money = (cents: number) =>
  (cents / 100).toLocaleString("en-US", { maximumFractionDigits: 2 });
export const trainingLink = (page: string, id?: string) =>
  `/package-training/${page}/index${id ? "?id=" + encodeURIComponent(id) : ""}`;
export function useTraining() {
  const catalog = ref<TrainingCatalog | null>(null),
    loading = ref(true),
    error = ref("");
  let generation = 0;
  async function load() {
    const mine = ++generation;
    loading.value = true;
    error.value = "";
    try {
      const next = await request<TrainingCatalog>(
        "/api/v1/training-catalog?region=310000",
      );
      if (mine === generation) catalog.value = next;
    } catch (e) {
      if (mine === generation) {
        catalog.value = null;
        error.value = (e as Error).message;
      }
    } finally {
      if (mine === generation) loading.value = false;
    }
  }
  onShow(() => void load());
  return {
    catalog,
    loading,
    error,
    load,
    current: computed(() => !!catalog.value && trainingCurrent(catalog.value)),
  };
}
