import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import type {
  DiaryEntry, Food, LabelAnalysis, MealAnalysis, NewDiaryEntry, Profile, Targets, User,
} from "./types";

// Set EXPO_PUBLIC_API_URL in app/.env to your computer's LAN IP, e.g. http://192.168.1.10:4000
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";
const TOKEN_KEY = "fittonesugo_token";

let token: string | null = null;

function browserStorage(): Storage | null {
  return typeof globalThis.localStorage === "undefined" ? null : globalThis.localStorage;
}

export async function loadToken() {
  if (Platform.OS === "web") {
    token = browserStorage()?.getItem(TOKEN_KEY) ?? null;
  } else {
    token = await SecureStore.getItemAsync(TOKEN_KEY);
  }
  return token;
}
export async function setToken(t: string | null) {
  token = t;
  if (Platform.OS === "web") {
    const storage = browserStorage();
    if (t) storage?.setItem(TOKEN_KEY, t);
    else storage?.removeItem(TOKEN_KEY);
  } else if (t) {
    await SecureStore.setItemAsync(TOKEN_KEY, t);
  } else {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
}

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

async function request<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
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

type AuthRes = { token: string; user: User };

export const api = {
  register: (name: string, email: string, password: string) =>
    request<AuthRes>("/auth/register", { method: "POST", body: { name, email, password } }),
  login: (email: string, password: string) =>
    request<AuthRes>("/auth/login", { method: "POST", body: { email, password } }),
  me: () => request<{ user: User; profile: Profile | null; targets: Targets | null }>("/me"),
  saveProfile: (p: Profile) => request<{ profile: Profile; targets: Targets }>("/profile", { method: "PUT", body: p }),

  searchFoods: (q: string) => request<Food[]>(`/foods/search?q=${encodeURIComponent(q)}`),
  createFood: (f: Omit<Food, "id">) => request<Food>("/foods", { method: "POST", body: f }),

  diary: (date: string) => request<DiaryEntry[]>(`/diary?date=${date}`),
  addEntries: (e: NewDiaryEntry | NewDiaryEntry[]) => request<{ ok: true; added: number }>("/diary", { method: "POST", body: e }),
  deleteEntry: (id: number) => request<{ ok: boolean }>(`/diary/${id}`, { method: "DELETE" }),
  summary: (from: string, to: string) =>
    request<{ date: string; kcal: number; protein_g: number; carbs_g: number; fat_g: number }[]>(`/diary/summary?from=${from}&to=${to}`),

  logWeight: (date: string, weight_kg: number) => request<{ ok: true }>("/weight", { method: "POST", body: { date, weight_kg } }),
  weights: () => request<{ date: string; weight_kg: number }[]>("/weight"),

  analyzeMeal: (image_base64: string, total_grams: number | null, note: string | null) =>
    request<MealAnalysis>("/ai/meal", { method: "POST", body: { image_base64, media_type: "image/jpeg", total_grams, note } }),
  analyzeLabel: (image_base64: string) =>
    request<LabelAnalysis>("/ai/label", { method: "POST", body: { image_base64, media_type: "image/jpeg" } }),
};
