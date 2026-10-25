import { beforeEach, it, expect, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { usePersonal } from "./personal";
import { usePreferences } from "./preferences";
let memory: Map<string, unknown>;
let fail = false;
beforeEach(() => {
  memory = new Map();
  fail = false;
  vi.stubGlobal("uni", {
    getStorageSync: (k: string) => memory.get(k),
    setStorageSync: (k: string, v: unknown) => {
      if (fail) throw new Error("quota");
      memory.set(k, v);
    },
    getStorageInfoSync: () => ({ keys: [...memory.keys()] }),
    showToast: vi.fn(),
  });
  setActivePinia(createPinia());
});
const tasks = [{ key: "sample", title: "一个真实待办", note: "准备说明" }];
it("指南重复添加不重置进度或改写原任务快照", () => {
  const s = usePersonal();
  s.addGuide("preparing", 1, tasks);
  s.setTask({ ...s.tasks[0], state: "done" });
  s.addGuide("preparing", 2, [{ ...tasks[0], title: "修改后的模板" }]);
  expect(s.tasks).toHaveLength(1);
  expect(s.tasks[0]).toMatchObject({
    state: "done",
    title: "一个真实待办",
    templateVersion: 1,
  });
});
it("切换阶段和地区不删除个人记录", () => {
  const s = usePersonal(),
    p = usePreferences();
  s.addGuide("preparing", 1, tasks);
  p.update({ stage: "rejoining", region: "310000" });
  expect(s.tasks).toHaveLength(1);
  expect(s.tasks[0].stage).toBe("preparing");
});
it("保存失败保留内存并在重试后确实写入", () => {
  const s = usePersonal();
  fail = true;
  expect(s.addGuide("newly", 1, tasks)).toBe(false);
  expect(s.saved).toBe(false);
  expect(s.tasks).toHaveLength(1);
  fail = false;
  expect(s.addGuide("newly", 1, tasks)).toBe(true);
  expect(memory.get("uhb:v1:task:newly:sample")).toMatchObject({
    title: "一个真实待办",
  });
});
it("其他记录写入成功不会掩盖已有保存失败", () => {
  const s = usePersonal();
  fail = true;
  s.addGuide("newly", 1, tasks);
  fail = false;
  s.toggleBookmark({ id: "x", title: "文章", kind: "article" });
  expect(s.saved).toBe(false);
  expect(s.retrySave()).toBe(true);
});
it("取消收藏写入删除状态，重建 store 后不会复活", () => {
  const s = usePersonal();
  const item = { id: "x", title: "文章", kind: "article" as const };
  s.toggleBookmark(item);
  s.toggleBookmark(item);
  setActivePinia(createPinia());
  expect(usePersonal().bookmarks[0].deleted).toBe(true);
});
