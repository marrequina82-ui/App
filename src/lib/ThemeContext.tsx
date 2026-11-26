import * as SecureStore from "expo-secure-store";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Platform, useColorScheme } from "react-native";
import { applyPalette, type ThemeName } from "./theme";

export type ThemeMode = "system" | "light" | "dark";

const KEY = "fittonesugo_theme";

async function loadMode(): Promise<ThemeMode> {
  try {
    const v = Platform.OS === "web" ? globalThis.localStorage?.getItem(KEY) : await SecureStore.getItemAsync(KEY);
    return v === "light" || v === "dark" || v === "system" ? v : "dark";
  } catch {
    return "dark";
  }
}

async function saveMode(m: ThemeMode) {
  if (Platform.OS === "web") globalThis.localStorage?.setItem(KEY, m);
  else await SecureStore.setItemAsync(KEY, m);
}

const Ctx = createContext<{ mode: ThemeMode; theme: ThemeName; setMode: (m: ThemeMode) => void } | null>(null);

/** Applies the saved palette before anything renders. Key the navigator on `theme` so screens re-read the colours. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode | null>(null);

  useEffect(() => { loadMode().then(setModeState); }, []);

  if (!mode) return null;
  const theme: ThemeName = mode === "system" ? (system === "light" ? "light" : "dark") : mode;
  applyPalette(theme);

  const setMode = (m: ThemeMode) => {
    setModeState(m);
    saveMode(m).catch(() => {});
  };

  return <Ctx.Provider value={{ mode, theme, setMode }}>{children}</Ctx.Provider>;
}

export function useTheme() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useTheme must be used inside ThemeProvider");
  return v;
}
