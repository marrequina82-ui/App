import type { IconName } from "@/components/ui";

/** Built-in avatars: an icon on a two-tone gradient. Stored as "preset:<id>". */
export const AVATAR_PRESETS: { id: string; icon: IconName; colors: [string, string] }[] = [
  { id: "sprout", icon: "feather", colors: ["#DDF58A", "#7BD389"] },
  { id: "sun", icon: "sun", colors: ["#FDE68A", "#F59E0B"] },
  { id: "flame", icon: "zap", colors: ["#FDBA74", "#EF4444"] },
  { id: "heart", icon: "heart", colors: ["#FBCFE8", "#EC4899"] },
  { id: "moon", icon: "moon", colors: ["#C4B5FD", "#6D28D9"] },
  { id: "wave", icon: "droplet", colors: ["#A5F3FC", "#0E7490"] },
  { id: "star", icon: "star", colors: ["#FEF08A", "#CA8A04"] },
  { id: "trophy", icon: "award", colors: ["#FCD34D", "#B45309"] },
  { id: "target", icon: "target", colors: ["#FCA5A5", "#B91C1C"] },
  { id: "pulse", icon: "activity", colors: ["#86EFAC", "#15803D"] },
  { id: "coffee", icon: "coffee", colors: ["#D6BCA0", "#78350F"] },
  { id: "smile", icon: "smile", colors: ["#BAE6FD", "#2563EB"] },
];

export function presetFor(avatar: string | null | undefined) {
  if (!avatar?.startsWith("preset:")) return null;
  const id = avatar.slice("preset:".length);
  return AVATAR_PRESETS.find((p) => p.id === id) ?? null;
}
