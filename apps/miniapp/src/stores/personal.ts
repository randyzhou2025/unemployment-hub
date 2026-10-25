import { defineStore } from "pinia";
import { ref } from "vue";
import { storage } from "../services/storage";
import { readRecords, saveLocal } from "../services/storage-core";
import { applicationStatuses, type StageKey } from "@uh/domain";
export type Task = {
  id: string;
  title: string;
  note: string;
  stage: StageKey;
  state: "todo" | "done" | "not-applicable";
  templateVersion: number;
  deleted?: boolean;
};
export type Bookmark = {
  id: string;
  title: string;
  kind: "article" | "guide" | "resource";
  deleted?: boolean;
};
export type Application = {
  id: string;
  company: string;
  role: string;
  status: (typeof applicationStatuses)[number];
  nextStep: string;
  date: string;
  notes: string;
  deleted?: boolean;
  updatedAt: string;
};
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const validTask = (v: unknown): v is Task =>
  object(v) &&
  typeof v.id === "string" &&
  typeof v.title === "string" &&
  typeof v.note === "string" &&
  ["preparing", "newly", "between", "seeking", "rejoining"].includes(
    String(v.stage),
  ) &&
  ["todo", "done", "not-applicable"].includes(String(v.state));
const validBookmark = (v: unknown): v is Bookmark =>
  object(v) &&
  typeof v.id === "string" &&
  typeof v.title === "string" &&
  ["article", "guide", "resource"].includes(String(v.kind));
const validApplication = (v: unknown): v is Application =>
  object(v) &&
  typeof v.id === "string" &&
  ["company", "role", "nextStep", "date", "notes", "updatedAt"].every(
    (k) => typeof v[k] === "string",
  ) &&
  (applicationStatuses as readonly unknown[]).includes(v.status);
export const usePersonal = defineStore("personal", () => {
  const tasks = ref(readRecords(storage, "uhb:v1:task:", validTask));
  const bookmarks = ref(
    readRecords(storage, "uhb:v1:bookmark:", validBookmark),
  );
  const applications = ref(
    readRecords(storage, "uhb:v1:application:", validApplication),
  );
  const saved = ref(true);
  const pending = new Set<string>();
  function persist(kind: string, item: Task | Bookmark | Application) {
    const key = `uhb:v1:${kind}:${item.id}`;
    const result = saveLocal(
      storage,
      key,
      JSON.parse(JSON.stringify(item)),
    ).saved;
    if (result) pending.delete(key);
    else pending.add(key);
    saved.value = pending.size === 0;
    return result;
  }
  function setTask(item: Task) {
    const i = tasks.value.findIndex((t) => t.id === item.id);
    if (i < 0) tasks.value.push(item);
    else tasks.value[i] = item;
    return persist("task", item);
  }
  function addGuide(
    stage: StageKey,
    version: number,
    items: { key: string; title: string; note: string }[],
  ) {
    let allSaved = true;
    for (const t of items) {
      const id = stage + ":" + t.key;
      const existing = tasks.value.find((x) => x.id === id);
      if (existing) {
        if (pending.has("uhb:v1:task:" + id) && !persist("task", existing))
          allSaved = false;
      } else if (
        !setTask({
          id,
          title: t.title,
          note: t.note,
          stage,
          state: "todo",
          templateVersion: version,
        })
      )
        allSaved = false;
    }
    saved.value = pending.size === 0;
    return allSaved;
  }
  function toggleBookmark(item: Bookmark) {
    const existing = bookmarks.value.find((x) => x.id === item.id);
    const next = { ...item, deleted: existing ? !existing.deleted : false };
    if (existing) Object.assign(existing, next);
    else bookmarks.value.push(next);
    return persist("bookmark", next);
  }
  function saveApplication(item: Application) {
    const i = applications.value.findIndex((a) => a.id === item.id);
    if (i < 0) applications.value.push(item);
    else applications.value[i] = item;
    return persist("application", item);
  }
  function retrySave() {
    for (const [kind, items] of [
      ["task", tasks.value],
      ["bookmark", bookmarks.value],
      ["application", applications.value],
    ] as const)
      for (const item of items)
        if (pending.has(`uhb:v1:${kind}:${item.id}`)) persist(kind, item);
    return saved.value;
  }
  return {
    retrySave,
    tasks,
    bookmarks,
    applications,
    saved,
    setTask,
    addGuide,
    toggleBookmark,
    saveApplication,
  };
});
