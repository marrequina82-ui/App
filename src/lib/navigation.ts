import { router } from "expo-router";
import type { DiaryEntry } from "./types";

/** Opens the meal detail screen for a diary entry. The entry is passed as JSON. */
export function openEntry(entry: DiaryEntry) {
  router.push({ pathname: "/meal/[id]", params: { id: String(entry.id), data: JSON.stringify(entry) } });
}
