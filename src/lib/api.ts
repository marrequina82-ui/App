import { auth } from "./firebase";
import type {
  DiaryEntry, Food, LabelAnalysis, MealAnalysis, NewDiaryEntry, Profile, Targets, User,
} from "./types";

// Set EXPO_PUBLIC_API_URL in app/.env to your computer's LAN IP, e.g. http://192.168.1.10:4000
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

async function request<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  // Firebase refreshes the ID token automatically when it is close to expiring.
  const token = (await auth?.currentUser?.getIdToken()) ?? null;
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: init.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    throw new ApiError(`Can't reach the server at ${API_URL}. Is it running and on the same Wi-Fi?`, 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError((data as { error?: string }).error ?? `Request failed (${res.status})`, res.status);
  return data as T;
}

export const api = {
  legacyCheck: (email: string, password: string) => request<{ ok: boolean }>("/auth/legacy/check", { method: "POST", body: { email, password } }),
  legacyLink: (email: string, password: string) => request<{ ok: true }>("/auth/legacy/link", { method: "POST", body: { email, password } }),
  discord: (body: { code: string; code_verifier: string; redirect_uri: string; client_id: string }) =>
    request<{ firebase_token: string }>("/auth/discord", { method: "POST", body }),
  me: () => request<{ user: User; profile: Profile | null; targets: Targets | null }>("/me"),
  saveProfile: (p: Profile) => request<{ profile: Profile; targets: Targets }>("/profile", { method: "PUT", body: p }),

  searchFoods: (q: string) => request<Food[]>(`/foods/search?q=${encodeURIComponent(q)}`),
  createFood: (f: Omit<Food, "id">) => request<Food>("/foods", { method: "POST", body: f }),

  diary: (date: string) => request<DiaryEntry[]>(`/diary?date=${date}`),
  addEntries: (e: NewDiaryEntry | NewDiaryEntry[]) => request<{ ok: true; added: number }>("/diary", { method: "POST", body: e }),
  deleteEntry: (id: number) => request<{ ok: boolean }>(`/diary/${id}`, { method: "DELETE" }),
  summary: (from: string, to: string) =>
    request<{ date: string; kcal: number; protein_g: number; carbs_g: number; fat_g: number }[]>(`/diary/summary?from=${from}&to=${to}`),

  setAvatar: (avatar: string | null) => request<{ avatar: string | null }>("/me/avatar", { method: "PUT", body: { avatar } }),
  exportData: () => request<Record<string, unknown>>("/export"),
  clearDiary: () => request<{ ok: true; deleted: number }>("/diary", { method: "DELETE" }),
  deleteAccount: () => request<{ ok: true }>("/account/delete", { method: "POST", body: { confirm: "DELETE" } }),

  logWeight: (date: string, weight_kg: number) => request<{ ok: true }>("/weight", { method: "POST", body: { date, weight_kg } }),
  weights: () => request<{ date: string; weight_kg: number }[]>("/weight"),

  analyzeMeal: (image_base64: string, total_grams: number | null, note: string | null) =>
    request<MealAnalysis>("/ai/meal", { method: "POST", body: { image_base64, media_type: "image/jpeg", total_grams, note } }),
  analyzeLabel: (image_base64: string) =>
    request<LabelAnalysis>("/ai/label", { method: "POST", body: { image_base64, media_type: "image/jpeg" } }),
};
