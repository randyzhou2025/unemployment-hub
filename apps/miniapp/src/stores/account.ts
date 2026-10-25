import { defineStore } from "pinia";
import { ref } from "vue";
import type { MiniAccount, MiniAccountSession } from "@uh/contracts";
import { request } from "../services/http";
import { readLocal, saveLocal } from "../services/storage-core";
import { storage } from "../services/storage";
const key = "uhb:v1:account-session";
let supportsWechat = false;
// #ifdef MP-WEIXIN
supportsWechat = true;
// #endif
function valid(v: unknown): v is MiniAccountSession {
  if (!v || typeof v !== "object") return false;
  const s = v as MiniAccountSession;
  return (
    typeof s.token === "string" &&
    /^[a-f0-9]{64}$/.test(s.token) &&
    typeof s.expiresAt === "string" &&
    !!s.user &&
    typeof s.user.id === "string" &&
    typeof s.user.nickname === "string" &&
    typeof s.user.createdAt === "string"
  );
}
export const useAccount = defineStore("account", () => {
  const cached = readLocal(storage, key, valid),
    user = ref<MiniAccount | null>(cached?.user || null);
  let session = cached,
    pending: Promise<void> | null = null,
    lastActive = 0;
  async function connect() {
    if (session && Date.parse(session.expiresAt) > Date.now()) {
      try {
        const result = await request<{ user: MiniAccount }>(
          "/api/v1/account/activity",
          "POST",
          {},
          session.token,
        );
        user.value = result.user;
        lastActive = Date.now();
        return;
      } catch (e) {
        if ((e as Error & { statusCode?: number }).statusCode !== 401) return;
        session = null;
        storage.remove(key);
      }
    }
    const code = await new Promise<string>((resolve, reject) =>
      uni.login({
        provider: "weixin",
        success: (r) => (r.code ? resolve(r.code) : reject(new Error("login"))),
        fail: reject,
      }),
    );
    const result = await request<MiniAccountSession>(
      "/api/v1/account/session",
      "POST",
      { code },
    );
    session = result;
    user.value = result.user;
    lastActive = Date.now();
    saveLocal(storage, key, result);
  }
  function resume(): Promise<void> {
    if (!supportsWechat) return Promise.resolve();
    if (pending) return pending;
    if (
      Date.now() - lastActive < 300000 &&
      new Date(lastActive).toDateString() === new Date().toDateString()
    )
      return Promise.resolve();
    pending = connect()
      .catch(() => {})
      .finally(() => {
        pending = null;
      });
    return pending;
  }
  return { user, resume };
});
