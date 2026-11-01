import { beforeEach, expect, it, vi } from "vitest";
import { go, openContent } from "./navigation";
beforeEach(() => vi.stubGlobal("uni", { navigateTo: vi.fn(), switchTab: vi.fn() }));
it("历史文章收藏不会生成阅读入口", () => {
  openContent({ id: "old-article", kind: "article" });
  expect(uni.navigateTo).not.toHaveBeenCalled();
  expect(uni.switchTab).toHaveBeenCalledWith({ url: "/pages/home/index" });
});
it("原待办链接与新入口都切换到主包待办标签", () => {
  go("/package-records/tasks/index");
  go("/pages/tasks/index");
  expect(uni.navigateTo).not.toHaveBeenCalled();
  expect(uni.switchTab).toHaveBeenNthCalledWith(1, { url: "/pages/tasks/index" });
  expect(uni.switchTab).toHaveBeenNthCalledWith(2, { url: "/pages/tasks/index" });
});
it("清单与官方渠道仍可打开，并编码内容编号", () => {
  openContent({ id: "resource/a", kind: "resource" });
  expect(uni.navigateTo).toHaveBeenCalledWith({ url: "/pages/resource/detail?id=resource%2Fa" });
});
