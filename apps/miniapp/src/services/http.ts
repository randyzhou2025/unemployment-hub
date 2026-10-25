import type { Envelope } from "@uh/contracts";
let base = "";
// #ifdef MP-WEIXIN
base = import.meta.env.VITE_API_BASE || "http://127.0.0.1:3070";
// #endif
export function request<T>(
  path: string,
  method: "GET" | "POST" = "GET",
  data?: unknown,
  token?: string,
): Promise<T> {
  return new Promise((resolve, reject) =>
    uni.request({
      url: base + path,
      method,
      header: token ? { Authorization: "Bearer " + token } : undefined,
      data: data as Record<string, unknown> | undefined,
      timeout: 10000,
      success: (r) => {
        if (r.statusCode >= 200 && r.statusCode < 300)
          resolve((r.data as Envelope<T>).data);
        else
          reject(
            Object.assign(new Error((r.data as { message?: string })?.message || "请求失败，请重试"), { statusCode: r.statusCode }),
          );
      },
      fail: () => reject(new Error("网络暂不可用，请检查连接后重试")),
    }),
  );
}
export function queryString(params: Record<string, unknown>) {
  return Object.entries(params)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(
      ([k, v]) => encodeURIComponent(k) + "=" + encodeURIComponent(String(v)),
    )
    .join("&");
}
