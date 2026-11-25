import { LinearGradient } from "expo-linear-gradient";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef } from "react";
import { Animated, Easing, Image, StyleSheet, Text, View } from "react-native";
import { colors, useNativeDriver } from "@/lib/theme";
import { useReduceMotion } from "./ui";

// The native splash (app.json) shows the same leaf on the same mint colour, so
// this overlay picks up where the OS splash leaves off.
const LEAF = require("../../assets/splash-icon.png");

/**
 * In-app animated splash. Plays a short intro, stays until the app is ready,
 * then fades out and calls onDone. Skips motion when reduce-motion is on.
 */
export function AnimatedSplash({ ready, onDone }: { ready: boolean; onDone: () => void }) {
  const reduce = useReduceMotion();
  const leaf = useRef(new Animated.Value(0)).current;
  const word = useRef(new Animated.Value(0)).current;
  const tag = useRef(new Animated.Value(0)).current;
  const exit = useRef(new Animated.Value(1)).current;
  const introDone = useRef(false);
  const exiting = useRef(false);
  const readyRef = useRef(ready);
  readyRef.current = ready;

  function tryExit() {
    if (exiting.current || !introDone.current || !readyRef.current) return;
    exiting.current = true;
    Animated.timing(exit, { toValue: 0, duration: reduce ? 0 : 420, easing: Easing.in(Easing.cubic), useNativeDriver }).start(() => onDone());
  }

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
    const d = reduce ? 0 : 1;
    Animated.stagger(reduce ? 0 : 170, [
      Animated.timing(leaf, { toValue: 1, duration: 720 * d, easing: Easing.out(Easing.back(1.3)), useNativeDriver }),
      Animated.timing(word, { toValue: 1, duration: 480 * d, easing: Easing.out(Easing.cubic), useNativeDriver }),
      Animated.timing(tag, { toValue: 1, duration: 420 * d, easing: Easing.out(Easing.cubic), useNativeDriver }),
    ]).start(() => {
      introDone.current = true;
      tryExit();
    });
    // The intro runs once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (ready) tryExit();
    // tryExit reads refs only, so depending on `ready` alone is correct.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: exit }]} pointerEvents="none" accessibilityLabel="Loading FittonesuGo">
      <LinearGradient colors={[colors.bg, colors.primarySoft]} style={StyleSheet.absoluteFill} />
      <View style={styles.center}>
        <Animated.View
          style={{
            opacity: leaf,
            transform: [{ scale: leaf.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }) }],
          }}
        >
          <Image source={LEAF} style={styles.leaf} resizeMode="contain" accessible={false} />
        </Animated.View>
        <Animated.Text
          style={[
            styles.word,
            { opacity: word, transform: [{ translateY: word.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] },
          ]}
        >
          FittonesuGo!
        </Animated.Text>
        <Animated.Text
          style={[
            styles.tag,
            { opacity: tag, transform: [{ translateY: tag.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] },
          ]}
        >
          Eat well. Move daily. One step at a time.
        </Animated.Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  leaf: { width: 170, height: 170 },
  word: { marginTop: 8, fontSize: 36, fontWeight: "900", color: colors.primaryDark, letterSpacing: -0.5 },
  tag: { marginTop: 8, fontSize: 16, color: colors.muted, textAlign: "center" },
});
