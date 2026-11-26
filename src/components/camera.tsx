import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Easing, Pressable, Text, View } from "react-native";
import { useReduceMotion, type IconName } from "./ui";
import { colors, radius } from "@/lib/theme";

// The camera is always dark, in both themes.
export const CAMERA_BG = "#0B0F0C";
const GLASS = "rgba(255,255,255,0.14)";

export function RoundIcon({ icon, label, onPress, disabled, caption, tone = "glass", size = 48 }: {
  icon: IconName; label: string; onPress: () => void; disabled?: boolean; caption?: string; tone?: "glass" | "lime"; size?: number;
}) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label} hitSlop={8} style={{ alignItems: "center", opacity: disabled ? 0.4 : 1 }}>
      {({ pressed }) => (
        <>
          <View style={{
            width: size, height: size, borderRadius: size / 2, alignItems: "center", justifyContent: "center",
            backgroundColor: tone === "lime" ? colors.lime : GLASS, transform: [{ scale: pressed ? 0.92 : 1 }],
          }}>
            <Feather name={icon} size={size * 0.42} color={tone === "lime" ? colors.onLime : "#FFFFFF"} />
          </View>
          {caption ? <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 11, fontWeight: "600", marginTop: 6 }}>{caption}</Text> : null}
        </>
      )}
    </Pressable>
  );
}

export function ShutterButton({ onPress, busy }: { onPress: () => void; busy?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={busy} accessibilityRole="button" accessibilityLabel="Take photo and scan">
      {({ pressed }) => (
        <View style={{ width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }}>
          <View style={{
            width: 64, height: 64, borderRadius: 32, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center",
            transform: [{ scale: pressed ? 0.88 : 1 }], opacity: busy ? 0.6 : 1,
          }}>
            {busy ? <ActivityIndicator color={CAMERA_BG} /> : null}
          </View>
        </View>
      )}
    </Pressable>
  );
}

/** Sweeping scan line, pulsing corner brackets and a status pill, laid over the captured photo. */
export function ScanOverlay({ title, steps }: { title: string; steps: string[] }) {
  const reduce = useReduceMotion();
  const [height, setHeight] = useState(0);
  const [step, setStep] = useState(0);
  const sweep = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const t = setInterval(() => setStep((s) => (s + 1) % steps.length), 1800);
    return () => clearInterval(t);
  }, [steps.length]);

  useEffect(() => {
    if (reduce) return;
    const loops = [
      Animated.loop(Animated.sequence([
        Animated.timing(sweep, { toValue: 1, duration: 1700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(sweep, { toValue: 0, duration: 1700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])),
      Animated.loop(Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])),
    ];
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [reduce, sweep, pulse]);

  const bracketScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.94] });

  return (
    <View
      pointerEvents="none"
      onLayout={(e) => setHeight(e.nativeEvent.layout.height)}
      style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.3)" }}
      accessibilityLiveRegion="polite"
      accessibilityLabel={`${title} ${steps[step]}`}
    >
      {height > 0 && !reduce ? (
        <Animated.View style={{ position: "absolute", left: 0, right: 0, top: -60, height: 62, transform: [{ translateY: sweep.interpolate({ inputRange: [0, 1], outputRange: [0, height] }) }] }}>
          <LinearGradient colors={["rgba(221,245,138,0)", "rgba(221,245,138,0.35)"]} style={{ height: 60 }} />
          <View style={{ height: 2, backgroundColor: colors.lime, shadowColor: colors.lime, shadowOpacity: 0.9, shadowRadius: 8 }} />
        </Animated.View>
      ) : null}

      <Animated.View style={{ position: "absolute", top: 24, left: 24, right: 24, bottom: 80, transform: [{ scale: bracketScale }] }}>
        <Bracket pos="tl" /><Bracket pos="tr" /><Bracket pos="bl" /><Bracket pos="br" />
      </Animated.View>

      <View style={{ position: "absolute", bottom: 20, alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "rgba(11,15,12,0.78)", borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 10 }}>
        <ActivityIndicator size="small" color={colors.lime} />
        <View>
          <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 14 }}>{title}</Text>
          <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>{steps[step]}</Text>
        </View>
      </View>
    </View>
  );
}

function Bracket({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) {
  const top = pos[0] === "t";
  const left = pos[1] === "l";
  return (
    <View style={{
      position: "absolute", width: 34, height: 34,
      top: top ? 0 : undefined, bottom: top ? undefined : 0, left: left ? 0 : undefined, right: left ? undefined : 0,
      borderColor: colors.lime,
      borderTopWidth: top ? 4 : 0, borderBottomWidth: top ? 0 : 4, borderLeftWidth: left ? 4 : 0, borderRightWidth: left ? 0 : 4,
      borderTopLeftRadius: top && left ? 14 : 0, borderTopRightRadius: top && !left ? 14 : 0,
      borderBottomLeftRadius: !top && left ? 14 : 0, borderBottomRightRadius: !top && !left ? 14 : 0,
    }} />
  );
}

