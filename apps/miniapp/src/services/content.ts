import { ref } from "vue";
import type { ContentSummary, PageResult } from "@uh/contracts";
import { request, queryString } from "./http";
export function useContentList(getParams: () => Record<string, unknown>) {
  const items = ref<ContentSummary[]>([]),
    loading = ref(false),
    error = ref(""),
    nextCursor = ref<number | null>(null);
  let version = 0;
  async function load(more = false) {
    const mine = ++version;
    const params = {
      ...getParams(),
      limit: 12,
      cursor: more ? nextCursor.value : 0,
    };
    if (more && nextCursor.value === null) return;
    loading.value = true;
    error.value = "";
    try {
      const result = await request<PageResult>(
        "/api/v1/contents?" + queryString(params),
      );
      if (mine !== version) return;
      items.value = more ? [...items.value, ...result.items] : result.items;
      nextCursor.value = result.nextCursor;
    } catch (e) {
      if (mine === version) error.value = (e as Error).message;
    } finally {
      if (mine === version) loading.value = false;
    }
  }
  return { items, loading, error, nextCursor, load };
}
