import { ref, computed } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import type { InsurancePolicy, InsuranceRouteId } from "@uh/contracts";
import {
  insuranceQuote,
  emptyInsuranceAnswers,
  type InsuranceAnswers,
} from "@uh/tool-core";
import { request } from "../services/http";
export const money = (cents: number) =>
  (cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
export function useInsurance() {
  const cityId = ref("310000"),
    policy = ref<InsurancePolicy | null>(null),
    cities = ref<{ cityId: string; cityName: string }[]>([]),
    error = ref(""),
    loading = ref(true);
  let version = 0;
  onLoad((q) => {
    cityId.value = String(
      q?.city || uni.getStorageSync("uhb:v1:insurance-city") || "310000",
    );
  });
  async function load() {
    const id = ++version;
    policy.value = null;
    error.value = "";
    loading.value = true;
    try {
      cities.value = await request<typeof cities.value>(
        "/api/v1/insurance-cities",
      );
      const result = await request<InsurancePolicy>(
        "/api/v1/insurance-policy/" + encodeURIComponent(cityId.value),
      );
      if (version === id) policy.value = result;
    } catch (e) {
      if (version === id) error.value = (e as Error).message;
    } finally {
      if (version === id) loading.value = false;
    }
  }
  function chooseCity() {
    if (!cities.value.length) {
      void load();
      return;
    }
    uni.showActionSheet({
      itemList: cities.value.map((c) => c.cityName),
      success: (r) => {
        cityId.value = cities.value[r.tapIndex].cityId;
        uni.setStorageSync("uhb:v1:insurance-city", cityId.value);
        void load();
      },
    });
  }
  function link(page: string, route?: InsuranceRouteId) {
    return `/package-insurance/${page}/index?city=${cityId.value}${route ? "&route=" + route : ""}`;
  }
  const cityName = computed(
    () =>
      policy.value?.cityName ||
      cities.value.find((c) => c.cityId === cityId.value)?.cityName ||
      "选择城市",
  );
  const stale = computed(
    () =>
      !!policy.value &&
      policy.value.reviewDueAt < new Date().toISOString().slice(0, 10),
  );
  const quote = (route: InsuranceRouteId, base?: number) =>
    policy.value ? insuranceQuote(policy.value, route, base) : null;
  onShow(() => void load());
  return {
    cityId,
    cityName,
    policy,
    cities,
    error,
    loading,
    stale,
    load,
    chooseCity,
    link,
    quote,
  };
}
export function readAnswers(cityId: string): InsuranceAnswers {
  const fallback = { ...emptyInsuranceAnswers, cityId };
  const value = uni.getStorageSync("uhb:v1:insurance-answers:" + cityId);
  if (!value || typeof value !== "object") return fallback;
  const valid: Record<string, string[]> = {
    status: [
      "receiving",
      "pending",
      "unemployed",
      "exhausted",
      "flexible",
      "employed",
      "unknown",
    ],
    benefitPlace: ["local", "other", "unknown"],
    residence: ["local", "nonlocal", "permit", "unknown"],
    medical: ["employee", "resident", "interrupted", "unknown"],
    pension: ["continue", "pause", "compare"],
    eligibility: ["confirmed", "unknown"],
    retirement: ["yes", "no", "unknown"],
  };
  for (const key of Object.keys(valid))
    if (!valid[key].includes(value[key])) return fallback;
  return { ...fallback, ...value, cityId };
}
export function saveAnswers(a: InsuranceAnswers) {
  try {
    uni.setStorageSync("uhb:v1:insurance-answers:" + a.cityId, { ...a });
  } catch {
    uni.showToast({ title: "存储空间不足，暂未保存", icon: "none" });
  }
}
