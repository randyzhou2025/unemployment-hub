import type { ContentSummary } from "@uh/contracts";
export function openContent(content: Pick<ContentSummary, "id" | "kind">) {
  if (content.kind === "article") {
    goHome();
    return;
  }
  uni.navigateTo({
    url: `/pages/${content.kind}/detail?id=${encodeURIComponent(content.id)}`,
  });
}
export function go(url: string) {
  const path = url.split("?")[0];
  const target = path === "/package-records/tasks/index" ? "/pages/tasks/index" : path;
  if (["/pages/home/index", "/pages/tasks/index", "/pages/tools/index", "/pages/me/index"].includes(target))
    uni.switchTab({ url: target });
  else uni.navigateTo({ url });
}

export function goHome() {
  uni.switchTab({ url: "/pages/home/index" });
}
export function back() {
  uni.navigateBack();
}
