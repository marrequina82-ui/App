import { Feather } from "@expo/vector-icons";
import { useEffect, useRef, type ReactNode } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { Animated, Easing, Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { presetFor } from "@/lib/avatars";
import { Press, Reveal, useReduceMotion, type IconName } from "./ui";
import { colors, minTouch, radius, space, themed, useNativeDriver } from "@/lib/theme";

/** Profile avatar: uploaded photo, built-in preset, or initials. */
export function Avatar({ name, avatar, size = 44 }: { name?: string | null; avatar?: string | null; size?: number }) {
  const initials = (name ?? "?").split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";
  const ring = { width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: colors.card, overflow: "hidden" as const };
  if (avatar?.startsWith("data:image/")) {
    return <Image source={{ uri: avatar }} style={ring} accessibilityLabel={`Profile photo for ${name ?? "you"}`} />;
  }
  const preset = presetFor(avatar);
  if (preset) {
    return (
      <LinearGradient colors={preset.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[ring, { alignItems: "center", justifyContent: "center" }]} accessible accessibilityLabel={`Profile for ${name ?? "you"}`}>
        <Feather name={preset.icon} size={size * 0.46} color="#0B0F0C" />
      </LinearGradient>
    );
  }
  return (
    <View
      accessible
      accessibilityLabel={`Profile for ${name ?? "you"}`}
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.card }}
    >
      <Text style={{ fontSize: size * 0.38, fontWeight: "800", color: colors.primaryDark }} importantForAccessibility="no">{initials}</Text>
    </View>
  );
}

/** Pulsing placeholder shown while data loads. Still under reduce-motion. */
export function Skeleton({ width = "100%", height = 16, radiusSize = 8, style }: { width?: number | `${number}%`; height?: number; radiusSize?: number; style?: StyleProp<ViewStyle> }) {
  const reduce = useReduceMotion();
  const o = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    if (reduce) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(o, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver }),
        Animated.timing(o, { toValue: 0.5, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [o, reduce]);
  return (
    <Animated.View
      accessibilityLabel="Loading"
      style={[{ width, height, borderRadius: radiusSize, backgroundColor: colors.primarySoft, opacity: o }, style]}
    />
  );
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <View style={styles.card}>
      <Skeleton width="40%" height={14} />
      <View style={{ height: 12 }} />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} width={i === lines - 1 ? "60%" : "100%"} height={12} style={{ marginBottom: 8 }} />
      ))}
    </View>
  );
}

/**
 * Scanner viewfinder: dark frame with corner brackets and an animated scan line.
 * Shows `children` over the frame (e.g. a photo or instructions).
 */
export function Viewfinder({ children, scanning = false, aspectRatio = 4 / 3 }: { children?: ReactNode; scanning?: boolean; aspectRatio?: number }) {
  const reduce = useReduceMotion();
  const line = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!scanning || reduce) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(line, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver }),
        Animated.timing(line, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [scanning, reduce, line]);

  return (
    <View style={[styles.viewfinder, { aspectRatio }]}>
      {children}
      <Corner pos="tl" /><Corner pos="tr" /><Corner pos="bl" /><Corner pos="br" />
      {scanning && !reduce ? (
        <Animated.View
          style={[
            styles.scanLine,
            { transform: [{ translateY: line.interpolate({ inputRange: [0, 1], outputRange: [16, 260] }) }] },
          ]}
        />
      ) : null}
    </View>
  );
}

function Corner({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) {
  const top = pos[0] === "t";
  const left = pos[1] === "l";
  return (
    <View
      style={{
        position: "absolute",
        width: 26,
        height: 26,
        top: top ? 14 : undefined,
        bottom: top ? undefined : 14,
        left: left ? 14 : undefined,
        right: left ? undefined : 14,
        borderColor: colors.lime,
        borderTopWidth: top ? 3 : 0,
        borderBottomWidth: top ? 0 : 3,
        borderLeftWidth: left ? 3 : 0,
        borderRightWidth: left ? 0 : 3,
        borderTopLeftRadius: top && left ? 8 : 0,
        borderTopRightRadius: top && !left ? 8 : 0,
        borderBottomLeftRadius: !top && left ? 8 : 0,
        borderBottomRightRadius: !top && !left ? 8 : 0,
      }}
    />
  );
}

/** Quick action tile for the dashboard. Icon-led, with a visible label. */
export function QuickAction({ icon, label, hint, onPress, tone = "soft" }: { icon: IconName; label: string; hint: string; onPress: () => void; tone?: "soft" | "solid" }) {
  const solid = tone === "solid";
  return (
    <Press onPress={onPress} accessibilityLabel={`${label}. ${hint}`} style={[styles.quick, solid && { backgroundColor: colors.primary }]}>
      <View style={[styles.quickIcon, { backgroundColor: solid ? "rgba(0,0,0,0.12)" : colors.primarySoft }]}>
        <Feather name={icon} size={20} color={solid ? colors.onPrimary : colors.primaryDark} accessible={false} importantForAccessibility="no" />
      </View>
      <Text style={[styles.quickLabel, solid && { color: colors.onPrimary }]}>{label}</Text>
      <Text style={[styles.quickHint, solid && { color: colors.onPrimary, opacity: 0.75 }]}>{hint}</Text>
    </Press>
  );
}

export function SectionTitle({ children, action, onAction }: { children: ReactNode; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionRow}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>{children}</Text>
      {action && onAction ? (
        <Press onPress={onAction} accessibilityLabel={action} style={{ minHeight: minTouch, justifyContent: "center" }}>
          <Text style={{ color: colors.primaryDark, fontWeight: "700", fontSize: 15 }}>{action}</Text>
        </Press>
      ) : null}
    </View>
  );
}

export function Chip({ label, tone = "soft" }: { label: string; tone?: "soft" | "lime" | "accent" }) {
  const bg = { soft: colors.primarySoft, lime: colors.lime, accent: colors.accentSoft }[tone];
  const fg = { soft: colors.primaryDark, lime: colors.onLime, accent: colors.accentText }[tone];
  return (
    <View style={{ alignSelf: "flex-start", backgroundColor: bg, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 }}>
      <Text style={{ color: fg, fontWeight: "700", fontSize: 12 }}>{label}</Text>
    </View>
  );
}

/** Wraps a dashboard section with a staggered entrance. */
export function Section({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return <Reveal delay={delay}>{children}</Reveal>;
}

const styles = themed(() => StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.md, padding: space(4), marginBottom: space(3), borderWidth: 1, borderColor: colors.border },
  viewfinder: {
    width: "100%",
    backgroundColor: colors.heroTop,
    borderRadius: radius.lg,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space(3),
  },
  scanLine: { position: "absolute", left: 22, right: 22, height: 2, backgroundColor: colors.lime, borderRadius: 2, opacity: 0.85 },
  quick: {
    width: "48%",
    flexGrow: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: space(4),
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 124,
  },
  quickIcon: { width: 40, height: 40, borderRadius: radius.sm, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  quickLabel: { fontSize: 15, fontWeight: "700", color: colors.text },
  quickHint: { fontSize: 13, color: colors.muted, marginTop: 2, lineHeight: 18 },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: space(4), marginBottom: space(2) },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: colors.text },
}));
