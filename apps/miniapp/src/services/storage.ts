import type { StoragePort } from "./storage-core";
export const storage: StoragePort = {
  get: (key) => uni.getStorageSync(key),
  set: (key, value) => uni.setStorageSync(key, value),
  keys: () => uni.getStorageInfoSync().keys,
  remove: (key) => uni.removeStorageSync(key),
};
