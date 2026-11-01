import { beforeEach, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { defaultHomeSections } from "@uh/domain";
import { useCatalog } from "./catalog";
import { request } from "../services/http";
vi.mock("../services/http", () => ({ request: vi.fn() }));
beforeEach(() => {
  vi.stubGlobal("uni", {
    getStorageSync: () => defaultHomeSections,
    setStorageSync: vi.fn(),
  });
  setActivePinia(createPinia());
});
it("缓存中的旧资讯板块不重新出现在首页", () => {
  expect(useCatalog().homeSections.map((s) => s.destination)).toEqual(["benefit-center", "insurance", "training"]);
});
it("远端板块顺序和开关有效，旧资讯目标仍被排除", async () => {
  vi.mocked(request).mockResolvedValue([...defaultHomeSections].reverse().map((s) => ({ ...s, enabled: s.destination !== "insurance" })));
  const catalog = useCatalog();
  await catalog.refreshHome();
  expect(catalog.homeSections.map((s) => s.destination)).toEqual(["training", "benefit-center"]);
});
