import { Feather } from "@expo/vector-icons";
import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import {
  ActivityIndicator, AccessibilityInfo, Animated, Easing, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
  type AccessibilityState, type GestureResponderEvent, type StyleProp, type TextInputProps, type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, minTouch, motion, radius, space, themed, useNativeDriver } from "@/lib/theme";
import { MEALS, MEAL_LABEL, type Meal } from "@/lib/types";

export type IconName = ComponentProps<typeof Feather>["name"];

/** Tracks the OS "reduce motion" setting. All animations are skipped when it is on. */
export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled?.().then((v) => { if (mounted) setReduce(!!v); }).catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.("reduceMotionChanged", (v: boolean) => setReduce(!!v));
    return () => { mounted = false; sub?.remove?.(); };
  }, []);
  return reduce;
}

/** Pops children into place (fade, lift, slight scale). Use a stagger delay for lists of sections. */
export function Reveal({ children, delay = 0, style }: { children: ReactNode; delay?: number; style?: StyleProp<ViewStyle> }) {
  const reduce = useReduceMotion();
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, {
      toValue: 1,
      duration: reduce ? 0 : motion.base + 80,
      delay: reduce ? 0 : delay,
      easing: Easing.out(Easing.back(1.4)),
      useNativeDriver,
    }).start();
  }, [delay, reduce, v]);
  return (
    <Animated.View
      style={[
        {
          opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: "clamp" }),
          transform: [
            { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) },
            { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
          ],
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

/** Pressable with a springy scale on touch. Keeps the tap target at the Pressable's size. */
export function Press({
  children, style, contentStyle, onPress, disabled, accessibilityLabel, accessibilityRole = "button", accessibilityState, hitSlop,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  onPress?: (e: GestureResponderEvent) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityRole?: "button" | "link" | "radio";
  accessibilityState?: AccessibilityState;
  hitSlop?: number;
}) {
  const reduce = useReduceMotion();
  const s = useRef(new Animated.Value(1)).current;
  const animateTo = (to: number) => {
    if (reduce) return;
    Animated.spring(s, { toValue: to, useNativeDriver, friction: 6, tension: 280 }).start();
  };
  // Size and placement go on the touch target; layout and looks go on the box that scales,
  // so `style` behaves like a normal View style (rows stay rows, backgrounds shrink on press).
  const { outer, inner } = splitPressStyle(style);
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => animateTo(motion.pressScale)}
      onPressOut={() => animateTo(1)}
      disabled={disabled}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={accessibilityState ?? { disabled: !!disabled }}
      hitSlop={hitSlop}
      style={outer}
    >
      <Animated.View style={[{ alignSelf: "stretch", flexGrow: 1, transform: [{ scale: s }] }, inner, contentStyle]}>{children}</Animated.View>
    </Pressable>
  );
}

const OUTER_KEYS = new Set([
  "flex", "flexGrow", "flexShrink", "flexBasis", "width", "height", "minWidth", "maxWidth", "alignSelf",
  "margin", "marginTop", "marginBottom", "marginLeft", "marginRight", "marginHorizontal", "marginVertical", "marginStart", "marginEnd",
  "position", "top", "bottom", "left", "right", "zIndex",
]);

function splitPressStyle(style: StyleProp<ViewStyle>) {
  const flat = (StyleSheet.flatten(style) ?? {}) as Record<string, unknown>;
  const outer: Record<string, unknown> = {};
  const inner: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(flat)) (OUTER_KEYS.has(k) ? outer : inner)[k] = v;
  if (flat.justifyContent) outer.justifyContent = flat.justifyContent;
  return { outer: outer as ViewStyle, inner: inner as ViewStyle };
}

export function Screen({ children, scroll = true, edges }: { children: ReactNode; scroll?: boolean; edges?: ("top" | "bottom")[] }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={edges ?? ["top"]}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">{children}</ScrollView>
      ) : (
        <View style={[styles.screen, { flex: 1 }]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function Title({ children, sub }: { children: ReactNode; sub?: string }) {
  return (
    <View style={{ marginBottom: space(5) }}>
      <Text accessibilityRole="header" style={styles.title}>{children}</Text>
      {sub ? <Text style={styles.sub}>{sub}</Text> : null}
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/** Square tile holding a vector icon. Decorative: the label beside it carries the meaning. */
export function IconTile({ name, tone = "soft", size = 40 }: { name: IconName; tone?: "soft" | "solid" | "accent"; size?: number }) {
  const bg = { soft: colors.primarySoft, solid: colors.primary, accent: colors.accentSoft }[tone];
  const fg = { soft: colors.primaryDark, solid: colors.onPrimary, accent: colors.accentText }[tone];
  return (
    <View style={{ width: size, height: size, borderRadius: radius.sm, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>
      <Feather name={name} size={size * 0.5} color={fg} accessible={false} importantForAccessibility="no" />
    </View>
  );
}

export function Button({
  title, onPress, variant = "primary", loading, disabled, icon,
}: { title: string; onPress: () => void; variant?: "primary" | "secondary" | "ghost" | "danger"; loading?: boolean; disabled?: boolean; icon?: IconName }) {
  const bg = { primary: colors.primary, secondary: colors.primarySoft, ghost: "transparent", danger: colors.dangerSoft }[variant];
  const fg = { primary: colors.onPrimary, secondary: colors.primaryDark, ghost: colors.primaryDark, danger: colors.danger }[variant];
  const isDisabled = !!disabled || !!loading;
  return (
    <Press
      onPress={onPress}
      disabled={isDisabled}
      accessibilityLabel={title}
      accessibilityState={{ disabled: isDisabled, busy: !!loading }}
      style={[styles.btn, { backgroundColor: bg, opacity: disabled ? 0.45 : 1 }]}
      contentStyle={{ alignItems: "center", justifyContent: "center" }}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.btnInner}>
          {icon ? <Feather name={icon} size={18} color={fg} accessible={false} importantForAccessibility="no" /> : null}
          <Text style={[styles.btnText, { color: fg }]}>{title}</Text>
        </View>
      )}
    </Press>
  );
}

/** Icon-only control: frosted round button, like the camera controls. Always has an accessible label. */
export function IconButton({ icon, label, onPress, color = colors.text }: { icon: IconName; label: string; onPress: () => void; color?: string }) {
  return (
    <Press onPress={onPress} accessibilityLabel={label} hitSlop={4} style={styles.iconBtn} contentStyle={styles.iconBtnInner}>
      <Feather name={icon} size={20} color={color} />
    </Press>
  );
}

export function Field({ label, hint, error, ...props }: TextInputProps & { label: string; hint?: string; error?: string | null }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ marginBottom: space(3) }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.placeholder}
        onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
        style={[styles.input, focused && styles.inputFocused, error ? styles.inputError : null]}
        {...props}
      />
      {error ? <Text style={styles.fieldError}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function Segmented<T extends string | number>({
  options, value, onChange, label, fullWidth = false,
}: { options: { label: string; value: T }[]; value: T; onChange: (v: T) => void; label?: string; fullWidth?: boolean }) {
  if (fullWidth) {
    return (
      <View style={styles.segTrack} accessibilityRole="radiogroup" accessibilityLabel={label}>
        {options.map((o) => {
          const active = o.value === value;
          return (
            <Press
              key={String(o.value)}
              onPress={() => onChange(o.value)}
              accessibilityRole="radio"
              accessibilityLabel={o.label}
              accessibilityState={{ selected: active }}
              style={[styles.segTrackItem, active && styles.segTrackActive]}
              contentStyle={{ flex: 1, alignItems: "center", justifyContent: "center" }}
            >
              <Text style={[styles.segTrackText, { color: active ? colors.onPrimary : colors.text }]}>{o.label}</Text>
            </Press>
          );
        })}
      </View>
    );
  }
  return (
    <View style={styles.segment} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Press
            key={String(o.value)}
            onPress={() => onChange(o.value)}
            accessibilityRole="radio"
            accessibilityLabel={o.label}
            accessibilityState={{ selected: active }}
            style={[styles.segItem, active && styles.segActive]}
            contentStyle={{ alignItems: "center", justifyContent: "center" }}
          >
            <Text style={[styles.segText, active && { color: colors.onPrimary }]}>{o.label}</Text>
          </Press>
        );
      })}
    </View>
  );
}

export function MealPicker({ value, onChange }: { value: Meal; onChange: (m: Meal) => void }) {
  return <Segmented label="Meal" options={MEALS.map((m) => ({ label: MEAL_LABEL[m], value: m }))} value={value} onChange={onChange} />;
}

export function ErrorText({ children }: { children?: string | null }) {
  if (!children) return null;
  return (
    <Reveal>
      <View style={styles.errorBox} accessibilityRole="alert">
        <Feather name="alert-circle" size={18} color={colors.danger} accessible={false} importantForAccessibility="no" />
        <Text style={styles.error}>{children}</Text>
      </View>
    </Reveal>
  );
}

export function Notice({ children }: { children: ReactNode }) {
  return (
    <View style={styles.notice}>
      <Feather name="info" size={18} color={colors.warnText} accessible={false} importantForAccessibility="no" />
      <Text style={styles.noticeText}>{children}</Text>
    </View>
  );
}

export function EmptyState({ icon, title, body }: { icon: IconName; title: string; body?: string }) {
  return (
    <Reveal style={{ alignItems: "center", paddingVertical: space(8), paddingHorizontal: space(4) }}>
      <IconTile name={icon} size={60} />
      <Text style={[styles.h2, { marginTop: space(3), textAlign: "center" }]}>{title}</Text>
      {body ? <Text style={[styles.muted, { textAlign: "center" }]}>{body}</Text> : null}
    </Reveal>
  );
}

export function MacroRow({ protein, carbs, fat }: { protein: number; carbs: number; fat: number }) {
  const p = Math.round(protein), c = Math.round(carbs), f = Math.round(fat);
  return (
    <View style={{ flexDirection: "row", gap: space(4), flexWrap: "wrap" }} accessibilityLabel={`Protein ${p} grams, carbs ${c} grams, fat ${f} grams`}>
      <Text style={[styles.macro, { color: colors.protein }]}>Protein {p} g</Text>
      <Text style={[styles.macro, { color: colors.carbs }]}>Carbs {c} g</Text>
      <Text style={[styles.macro, { color: colors.fat }]}>Fat {f} g</Text>
    </View>
  );
}

export function ProgressBar({ value, max, color, label }: { value: number; max: number; color: string; label?: string }) {
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  const reduce = useReduceMotion();
  const w = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(w, { toValue: pct, duration: reduce ? 0 : motion.slow, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [pct, reduce, w]);
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: Math.round(max), now: Math.round(value) }}
      style={{ height: 10, backgroundColor: colors.primarySoft, borderRadius: 5, overflow: "hidden" }}
    >
      <Animated.View
        style={{ width: w.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }), height: "100%", backgroundColor: color, borderRadius: 5 }}
      />
    </View>
  );
}

export const styles = themed(() => StyleSheet.create({
  screen: { padding: space(5), paddingBottom: space(12) },
  title: { fontSize: 28, fontWeight: "800", color: colors.text, letterSpacing: -0.4 },
  sub: { fontSize: 15, color: colors.muted, marginTop: 4, lineHeight: 22 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: space(4),
    marginBottom: space(3),
    borderWidth: 1,
    borderColor: colors.border,
  },
  btn: { minHeight: minTouch + 4, paddingVertical: 14, paddingHorizontal: 20, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", marginVertical: 6 },
  btnInner: { flexDirection: "row", alignItems: "center", gap: 8 },
  btnText: { fontSize: 16, fontWeight: "800" },
  iconBtn: { width: minTouch, height: minTouch, alignItems: "center", justifyContent: "center" },
  iconBtnInner: { width: 42, height: 42, flexGrow: 0, borderRadius: 21, backgroundColor: colors.glass, alignItems: "center", justifyContent: "center", alignSelf: "center" },
  label: { fontSize: 14, fontWeight: "600", color: colors.muted, marginBottom: 6 },
  input: { minHeight: minTouch, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.borderStrong, borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: colors.text },
  inputFocused: { borderColor: colors.primary, borderWidth: 2 },
  inputError: { borderColor: colors.danger },
  fieldError: { fontSize: 13, color: colors.danger, marginTop: 4 },
  hint: { fontSize: 13, color: colors.muted, marginTop: 4 },
  segment: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: space(3) },
  segItem: { minHeight: 44, justifyContent: "center", paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: colors.primarySoft },
  segActive: { backgroundColor: colors.primary },
  segTrack: { flexDirection: "row", backgroundColor: colors.primarySoft, borderRadius: radius.pill, padding: 4, marginBottom: space(4) },
  segTrackItem: { flex: 1, flexBasis: 0, minWidth: 0, minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: radius.pill },
  segTrackActive: { backgroundColor: colors.primary },
  segTrackText: { fontWeight: "700", fontSize: 15 },
  segText: { color: colors.text, fontWeight: "600", fontSize: 15 },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.dangerSoft, borderRadius: radius.sm, padding: space(3), marginVertical: space(2) },
  error: { color: colors.danger, flex: 1, fontSize: 14, fontWeight: "600" },
  notice: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: colors.warnBg, padding: space(3), borderRadius: radius.sm, marginBottom: space(3) },
  noticeText: { color: colors.warnText, fontSize: 14, flex: 1, lineHeight: 20 },
  macro: { fontSize: 13, fontWeight: "700" },
  h2: { fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: 8 },
  body: { fontSize: 16, color: colors.text, lineHeight: 22 },
  muted: { fontSize: 14, color: colors.muted, lineHeight: 20 },
}));
