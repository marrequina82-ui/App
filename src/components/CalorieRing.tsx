import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { colors, motion } from "@/lib/theme";
import { useReduceMotion } from "./ui";

/**
 * Animated calorie ring. The fill is animated with Animated.Value and written
 * back as a plain prop via a listener. This avoids Animated.createAnimatedComponent
 * on the SVG circle, which leaks a `collapsable` prop to the DOM on web.
 * `onDark` renders white and lime tones for use on a green hero panel.
 */
export function CalorieRing({ eaten, goal, size = 180, onDark = false }: { eaten: number; goal: number; size?: number; onDark?: boolean }) {
  const stroke = 16;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = goal > 0 ? Math.min(1, eaten / goal) : 0;
  const remaining = Math.round(goal - eaten);
  const over = remaining < 0;
  const reduce = useReduceMotion();

  const progress = useRef(new Animated.Value(0)).current;
  const [dashOffset, setDashOffset] = useState(c);

  useEffect(() => {
    const id = progress.addListener(({ value }) => setDashOffset(c * (1 - value)));
    return () => progress.removeListener(id);
  }, [progress, c]);

  useEffect(() => {
    Animated.timing(progress, { toValue: pct, duration: reduce ? 0 : motion.slow, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [pct, reduce, progress]);

  const summary = over ? `${Math.abs(remaining)} kcal over your goal` : `${remaining} kcal left of ${Math.round(goal)}`;
  const trackColor = onDark ? "rgba(255,255,255,0.18)" : colors.primarySoft;
  const fillColor = over ? colors.danger : onDark ? colors.mint : colors.primary;
  const numberColor = onDark ? colors.onPrimary : over ? colors.danger : colors.text;
  const captionColor = onDark ? colors.onHeroMuted : colors.muted;

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`Calories: ${summary}`}
      accessibilityValue={{ min: 0, max: Math.round(goal), now: Math.round(eaten) }}
      style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}
    >
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={trackColor} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={fillColor}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text style={{ fontSize: 36, fontWeight: "800", color: numberColor }} importantForAccessibility="no">{Math.abs(remaining)}</Text>
      <Text style={{ fontSize: 14, color: captionColor }} importantForAccessibility="no">{over ? "kcal over" : "kcal left"}</Text>
    </View>
  );
}
