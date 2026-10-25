import { it, expect } from "vitest";
import {
  readLocal,
  readRecords,
  saveLocal,
  type StoragePort,
} from "./storage-core";
function mock() {
  const data = new Map<string, unknown>();
  const port: StoragePort = {
    get: (k) => data.get(k),
    set: (k, v) => {
      data.set(k, v);
    },
    keys: () => [...data.keys()],
    remove: (k) => {
      data.delete(k);
    },
  };
  return { data, port };
}
const valid = (v: unknown): v is { id: string } =>
  !!v && typeof v === "object" && "id" in v && typeof v.id === "string";
it("损坏的存储不会当成有效记录", () => {
  const { port } = mock();
  port.set("a", { wrong: true });
  expect(readLocal(port, "a", valid)).toBeNull();
});
it("索引损坏时按记录键恢复，不依赖多键事务", () => {
  const { port } = mock();
  port.set("uhb:v1:task:a", { id: "a" });
  port.set("uhb:v1:task:b", { id: "b" });
  port.set("uhb:v1:task:broken", "oops");
  expect(readRecords(port, "uhb:v1:task:", valid).map((r) => r.id)).toEqual([
    "a",
    "b",
  ]);
});
it("保存失败必须返回失败，已有记录保留", () => {
  const { port } = mock();
  port.set("a", { id: "original" });
  port.set = () => {
    throw new Error("Quota exceeded");
  };
  expect(saveLocal(port, "a", { id: "new" }).saved).toBe(false);
  expect(readLocal(port, "a", valid)).toEqual({ id: "original" });
});
