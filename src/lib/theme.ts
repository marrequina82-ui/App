import { Platform } from "react-native";

// FittonesuGo design tokens. Brand palette from the redesign brief, with two
// contrast adjustments: buttons use the dark green (white text 6.9:1) instead of
// #4CAF72 (2.9:1), and secondary text is a darker gray (5.9:1) than #7A827B (3.8:1).
// Every text colour meets WCAG AA 4.5:1 on its background.

export const colors = {
  // Surfaces
  bg: "#F8F9F5", // warm off-white
  card: "#FFFFFF",
  surfaceTint: "#EEF6F0",
  border: "#E3E8E1",
  borderStrong: "#6E8A78", // input outline, 3.7:1 on white

  // Brand: fresh green
  primary: "#246B4B", // solid buttons, active states (white text 6.9:1)
  primaryDark: "#1B4F37", // text on light surfaces
  primaryBright: "#4CAF72", // decorative fills on light surfaces
  primarySoft: "#E8F5EC", // chips, tracks, highlighted cards
  onPrimary: "#FFFFFF",

  // Hero gradient (calorie progress, AI analysis, activity summaries only)
  heroTop: "#1B4F37",
  heroBottom: "#246B4B",
  onHeroMuted: "#D7EBDD", // 5.3:1 on heroBottom
  lime: "#DDF58A", // accent for hero ring fill and highlights
  mint: "#DDF58A", // fill on dark surfaces (alias used by the ring)

  // Text
  text: "#202820",
  muted: "#5F675F", // secondary text, 5.9:1 on bg

  // Accent and status
  accent: "#E8912D", // soft orange fills
  accentText: "#8A4B0F", // text on white and accentSoft (6.9:1)
  accentSoft: "#FFEDD5",
  danger: "#B42318",
  dangerSoft: "#FDECEA",
  warnBg: "#FFF4E0",
  warnText: "#7C2D12",

  // Macros: text-safe tones plus bar fills
  protein: "#6D28D9",
  proteinFill: "#8B5CF6",
  carbs: "#B45309",
  carbsFill: "#F59E0B",
  fat: "#0E7490",
  fatFill: "#06B6D4",

  placeholder: "#5E6B60",
};

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
  pressScale: 0.97,
};

// Native driver runs animations off the JS thread on iOS/Android. Web has no native driver.
export const useNativeDriver = Platform.OS !== "web";
