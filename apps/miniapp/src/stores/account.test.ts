import { beforeEach, it, expect, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useAccount } from "./account";
import { request } from "../services/http";
vi.mock("../services/http", () => ({ request: vi.fn() }));
const store = new Map<string, unknown>();
const user = {
  id: "user-1",
  nickname: "晨间川",
  createdAt: "2026-10-24T00:00:00Z",
};
const session = {
  token: "a".repeat(64),
  expiresAt: "2099-01-01T00:00:00Z",
  user,
};
const login = vi.fn((o: any) => o.success({ code: "wechat-code" }));
beforeEach(() => {
  store.clear();
  vi.clearAllMocks();
  setActivePinia(createPinia());
  vi.stubGlobal("uni", {
    login,
    getStorageSync: (k: string) => store.get(k),
    setStorageSync: (k: string, v: unknown) => store.set(k, v),
    removeStorageSync: (k: string) => store.delete(k),
  });
});
it("自动建号请求合并，短时间返回不重复记录访问", async () => {
  vi.mocked(request).mockResolvedValue(session);
  const account = useAccount();
  await Promise.all([account.resume(), account.resume()]);
  await account.resume();
  expect(login).toHaveBeenCalledTimes(1);
  expect(request).toHaveBeenCalledTimes(1);
  expect(request).toHaveBeenCalledWith("/api/v1/account/session", "POST", {
    code: "wechat-code",
  });
  expect(account.user).toEqual(user);
});
it("缓存身份用独立会话续接，仅上报空访问事件", async () => {
  store.set("uhb:v1:account-session", session);
  vi.mocked(request).mockResolvedValue({ user });
  const account = useAccount();
  await account.resume();
  expect(login).not.toHaveBeenCalled();
  expect(request).toHaveBeenCalledWith(
    "/api/v1/account/activity",
    "POST",
    {},
    session.token,
  );
});
it("会话失效重新微信登录，网络失败不抹掉缓存用户", async () => {
  store.set("uhb:v1:account-session", session);
  vi.mocked(request)
    .mockRejectedValueOnce(Object.assign(new Error(), { statusCode: 401 }))
    .mockResolvedValueOnce(session);
  await useAccount().resume();
  expect(login).toHaveBeenCalledTimes(1);
  setActivePinia(createPinia());
  vi.mocked(request).mockRejectedValueOnce(new Error("offline"));
  const offline = useAccount();
  await expect(offline.resume()).resolves.toBeUndefined();
  expect(offline.user).toEqual(user);
});
