import { Platform } from "react-native";

// FittonesuGo design tokens. Dark (default, matches the camera scanner) and light palettes.
// Every text colour meets WCAG AA 4.5:1 on the surface it is used on.
// The camera screens always use the dark look, whatever the theme.

export type ThemeName = "dark" | "light";

const dark = {
  // Surfaces
  bg: "#0B0F0C",
  card: "#151B16",
  surfaceTint: "#1C241D",
  border: "#232C24",
  borderStrong: "#4A5A4C", // input outline, 3.1:1 on card
  glass: "rgba(255,255,255,0.14)", // round floating buttons

  // Brand: lime on near-black
  primary: "#DDF58A", // solid buttons, active states (dark text 14:1)
  primaryDark: "#DDF58A", // accent text and icons on dark surfaces
  primaryBright: "#7BD389", // decorative fills
  primarySoft: "#1F2920", // chips, tracks, inactive segments
  onPrimary: "#0B0F0C", // text and icons on lime
  onLime: "#0B0F0C",

  // Hero gradient (calorie progress, AI analysis, summaries only)
  heroTop: "#173A26",
  heroBottom: "#21573A",
  onHero: "#FFFFFF",
  onHeroMuted: "#C9E3D1", // 7:1 on heroBottom
  lime: "#DDF58A",
  mint: "#DDF58A",

  // Text
  text: "#F2F5EF",
  muted: "#9BA79C", // secondary text, 7:1 on bg

  // Accent and status
  accent: "#F0A04B",
  accentText: "#F6B978",
  accentSoft: "#33240F",
  danger: "#FF8A7A",
  dangerSoft: "#3A1C18",
  warnBg: "#2C2411",
  warnText: "#F4CD84",

  // Macros: text-safe tones plus bar fills
  protein: "#B9A2FF",
  proteinFill: "#8B5CF6",
  carbs: "#F7B955",
  carbsFill: "#F59E0B",
  fat: "#5FD4E8",
  fatFill: "#06B6D4",

  placeholder: "#7C887D",
};

const light: typeof dark = {
  bg: "#F8F9F5",
  card: "#FFFFFF",
  surfaceTint: "#EEF6F0",
  border: "#E3E8E1",
  borderStrong: "#6E8A78",
  glass: "rgba(27,79,55,0.08)",

  primary: "#246B4B", // white text 6.9:1
  primaryDark: "#1B4F37",
  primaryBright: "#4CAF72",
  primarySoft: "#E8F5EC",
  onPrimary: "#FFFFFF",
  onLime: "#0B0F0C",

  heroTop: "#1B4F37",
  heroBottom: "#246B4B",
  onHero: "#FFFFFF",
  onHeroMuted: "#D7EBDD",
  lime: "#DDF58A",
  mint: "#DDF58A",

  text: "#202820",
  muted: "#5F675F",

  accent: "#E8912D",
  accentText: "#8A4B0F",
  accentSoft: "#FFEDD5",
  danger: "#B42318",
  dangerSoft: "#FDECEA",
  warnBg: "#FFF4E0",
  warnText: "#7C2D12",

  protein: "#6D28D9",
  proteinFill: "#8B5CF6",
  carbs: "#B45309",
  carbsFill: "#F59E0B",
  fat: "#0E7490",
  fatFill: "#06B6D4",

  placeholder: "#5E6B60",
};

/** Live palette. Mutated in place by applyPalette, so always read it at render time. */
export const colors = { ...dark };

const rebuilders: (() => void)[] = [];

/** Module-level styles that read `colors`. They are rebuilt in place when the palette changes. */
export function themed<T extends object>(make: () => T): T {
  const obj = { ...make() };
  rebuilders.push(() => Object.assign(obj, make()));
  return obj;
}

export function applyPalette(name: ThemeName) {
  Object.assign(colors, name === "light" ? light : dark);
  rebuilders.forEach((r) => r());
}

export const radius = { xs: 8, sm: 12, md: 20, lg: 28, pill: 999 };
export const space = (n: number) => n * 4;

// Touch targets: >= 44pt iOS, >= 48dp Android.
export const minTouch = 48;

// Motion tokens. Keep transitions inside these ranges.
export const motion = {
  fast: 160,
  base: 320,
  slow: 620,
  stagger: 70,
  pressScale: 0.94,
};

// Native driver runs animations off the JS thread on iOS/Android. Web has no native driver.
export const useNativeDriver = Platform.OS !== "web";
