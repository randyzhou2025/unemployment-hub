import { defineStore } from "pinia";
import { ref } from "vue";
import { isStage, type StageKey } from "@uh/domain";
import { storage } from "../services/storage";
import { readLocal, saveLocal } from "../services/storage-core";
type Preferences = {
  stage: StageKey | null;
  region: "national" | "310000";
  largeText: boolean;
};
export const usePreferences = defineStore("preferences", () => {
  const value = ref<Preferences>(
    readLocal(
      storage,
      "uhb:v1:preferences",
      (v): v is Preferences =>
        !!v &&
        typeof v === "object" &&
        "stage" in v &&
        (v.stage === null || isStage(v.stage)) &&
        "region" in v &&
        (v.region === "national" || v.region === "310000") &&
        "largeText" in v &&
        typeof v.largeText === "boolean",
    ) || { stage: null, region: "310000", largeText: false },
  );
  const saved = ref(true);
  function update(patch: Partial<Preferences>) {
    value.value = { ...value.value, ...patch };
    saved.value = saveLocal(storage, "uhb:v1:preferences", value.value).saved;
    if (!saved.value)
      uni.showToast({ title: "偏好暂未保存，请检查存储空间", icon: "none" });
  }
  return { value, saved, update };
});
