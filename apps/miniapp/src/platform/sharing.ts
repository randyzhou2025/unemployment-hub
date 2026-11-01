import { brand } from "@uh/domain";
export function contentShare(id: string, kind: "guide" | "resource", title: string) {
  return {
    title: title || brand.name,
    path: id
      ? `/pages/${kind}/detail?id=${encodeURIComponent(id)}`
      : "/pages/home/index",
  };
}
