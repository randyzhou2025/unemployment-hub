import type { ContentSummary } from "@uh/contracts";
export function openContent(content: Pick<ContentSummary, "id" | "kind">) {
  uni.navigateTo({
    url: `/pages/${content.kind}/detail?id=${encodeURIComponent(content.id)}`,
  });
}
export function go(url: string) {
  uni.navigateTo({ url });
}

export function goHome() {
  uni.switchTab({ url: "/pages/home/index" });
}
export function goInformation() {
  uni.switchTab({ url: "/pages/information/index" });
}
export function back() {
  uni.navigateBack();
}
