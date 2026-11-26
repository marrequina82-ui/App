import { Feather } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, Easing, Image, Pressable, ScrollView, Text, View } from "react-native";
import { MEALS, MEAL_LABEL, type Meal } from "@/lib/types";
import { SafeAreaView } from "react-native-safe-area-context";
import { CAMERA_BG, RoundIcon, ScanOverlay, ShutterButton } from "./camera";
import { AppDialog, type DialogSpec } from "./dialog";
import { Button, Reveal, useReduceMotion, type IconName } from "./ui";
import { getPhoto, shrinkPhoto, type PickedImage } from "@/lib/image";
import { colors, radius, space } from "@/lib/theme";

const RESULT_FRAME_H = 200;
const MAX_LABELS = 4;

type Phase = "camera" | "scanning" | "results";

export function leaveScanner() {
  if (router.canGoBack()) router.back();
  else router.replace("/");
}

export interface ScanScreenProps {
  titles: Record<Phase, string>;
  hint: string;
  scanTitle: string;
  scanSteps: string[];
  /** Shown when `analyze` resolves false (nothing recognisable in the photo). */
  notFound: { icon: IconName; title: string; message: string };
  switchAction: { icon: IconName; caption: string; label: string; onPress: () => void };
  /** Resolves true when results are ready to show, false when nothing was found. Throws on failure. */
  analyze: (photo: PickedImage) => Promise<boolean>;
  onReset: () => void;
  photoLabels: string[];
  meal: Meal;
  onMealChange: (m: Meal) => void;
  children: ReactNode;
}

/** Full-screen camera → auto scan → results flow shared by the meal and label scanners. */
export function ScanScreen({ titles, hint, scanTitle, scanSteps, notFound, switchAction, analyze, onReset, photoLabels, meal, onMealChange, children }: ScanScreenProps) {
  const reduce = useReduceMotion();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const scanId = useRef(0);
  const askedOnce = useRef(false);

  const [phase, setPhase] = useState<Phase>("camera");
  const [facing, setFacing] = useState<"back" | "front">("back");
  const [cameraReady, setCameraReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [photo, setPhoto] = useState<PickedImage | null>(null);
  const [error, setError] = useState<DialogSpec | null>(null);
  const [frameH, setFrameH] = useState(0);
  const shrink = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (askedOnce.current || !permission || permission.granted || !permission.canAskAgain) return;
    askedOnce.current = true;
    requestPermission();
  }, [permission, requestPermission]);

  useEffect(() => {
    if (phase !== "results") return;
    if (reduce) {
      shrink.setValue(1);
      return;
    }
    Animated.timing(shrink, { toValue: 1, duration: 560, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [phase, reduce, shrink]);

  function backToCamera() {
    scanId.current++;
    shrink.setValue(0);
    setPhoto(null);
    onReset();
    setPhase("camera");
  }

  async function scan(p: PickedImage) {
    const id = ++scanId.current;
    setCameraReady(false);
    setPhoto(p);
    onReset();
    setPhase("scanning");
    try {
      const found = await analyze(p);
      if (id !== scanId.current) return;
      if (!found) {
        setError({
          ...notFound,
          primary: { label: "Retake photo", onPress: backToCamera },
          secondary: { label: "Choose from gallery", onPress: pickFromGallery },
          onDismiss: backToCamera,
        });
        return;
      }
      setPhase("results");
    } catch (e) {
      if (id !== scanId.current) return;
      setError({
        icon: "wifi-off",
        title: "Scan failed",
        message: (e as Error).message || "Something went wrong while analyzing your photo. Check your connection and try again.",
        primary: { label: "Try again", onPress: () => scan(p) },
        secondary: { label: "Retake photo", onPress: backToCamera },
        onDismiss: backToCamera,
      });
    }
  }

  async function capture() {
    if (!cameraRef.current || !cameraReady || capturing) return;
    setCapturing(true);
    try {
      const shot = await cameraRef.current.takePictureAsync({ quality: 0.9 });
      const p = await shrinkPhoto(shot.uri, shot.width, shot.height);
      scan(p);
    } catch (e) {
      setError({
        icon: "camera-off",
        title: "Couldn't take photo",
        message: (e as Error).message || "The camera didn't respond. Please try again.",
        primary: { label: "OK", onPress: () => {} },
      });
    } finally {
      setCapturing(false);
    }
  }

  async function pickFromGallery() {
    try {
      const p = await getPhoto("library");
      if (p) scan(p);
      else backToCamera();
    } catch (e) {
      setError({
        icon: "image",
        title: "Gallery unavailable",
        message: (e as Error).message || "We couldn't open your photos.",
        primary: { label: "OK", onPress: () => {} },
      });
    }
  }

  const frameStyle = phase === "results" && frameH > 0
    ? { height: shrink.interpolate({ inputRange: [0, 1], outputRange: [frameH, RESULT_FRAME_H] }) }
    : { flex: 1 };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: CAMERA_BG }} edges={["top", "bottom"]}>
      <StatusBar style="light" />

      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: space(4), paddingVertical: space(2) }}>
        <RoundIcon icon="chevron-left" label="Close scanner" onPress={leaveScanner} size={44} />
        <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}>{titles[phase]}</Text>
        {phase === "camera" ? (
          <RoundIcon icon="refresh-cw" label="Switch camera" onPress={() => setFacing((f) => (f === "back" ? "front" : "back"))} size={44} />
        ) : phase === "results" ? (
          <RoundIcon icon="camera" label="Take another photo" onPress={backToCamera} tone="lime" size={44} />
        ) : (
          <View style={{ width: 44 }} />
        )}
      </View>

      <Animated.View
        onLayout={(e) => { if (phase !== "results") setFrameH(e.nativeEvent.layout.height); }}
        style={[{ marginHorizontal: space(3), borderRadius: radius.lg, overflow: "hidden", backgroundColor: "#151B16" }, frameStyle]}
      >
        {phase === "camera" ? (
          permission?.granted ? (
            <>
              <CameraView ref={cameraRef} facing={facing} style={{ flex: 1 }} onCameraReady={() => setCameraReady(true)} />
              <View pointerEvents="none" style={{ position: "absolute", top: 16, alignSelf: "center", backgroundColor: "rgba(11,15,12,0.6)", borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 7 }}>
                <Text style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "600" }}>{hint}</Text>
              </View>
              <View accessibilityRole="radiogroup" accessibilityLabel="Meal" style={{ position: "absolute", bottom: 14, left: 10, right: 10, flexDirection: "row", justifyContent: "center", gap: 6 }}>
                {MEALS.map((m) => {
                  const active = m === meal;
                  return (
                    <Pressable
                      key={m}
                      onPress={() => onMealChange(m)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: active }}
                      accessibilityLabel={MEAL_LABEL[m]}
                      hitSlop={6}
                      style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: active ? colors.lime : "rgba(11,15,12,0.6)" }}
                    >
                      <Text style={{ color: active ? colors.onLime : "#FFFFFF", fontSize: 13, fontWeight: "700" }}>{MEAL_LABEL[m]}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: space(6), gap: 12 }}>
              <Feather name="camera-off" size={40} color={colors.lime} />
              <Text style={{ color: "#FFFFFF", fontSize: 18, fontWeight: "800", textAlign: "center" }}>Camera access needed</Text>
              <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, textAlign: "center", lineHeight: 20 }}>
                Allow camera access to take a photo, or pick one from your gallery.
              </Text>
              {permission && !permission.canAskAgain ? (
                <Text style={{ color: colors.lime, fontSize: 13, textAlign: "center" }}>Turn on camera access for FittonesuGo in your phone's Settings.</Text>
              ) : (
                <View style={{ alignSelf: "stretch" }}>
                  <Button title="Allow camera" icon="camera" onPress={requestPermission} />
                </View>
              )}
            </View>
          )
        ) : photo ? (
          <>
            <Image source={{ uri: photo.uri }} style={{ flex: 1 }} resizeMode="cover" accessibilityLabel="Your photo" />
            {phase === "scanning" && !error ? <ScanOverlay title={scanTitle} steps={scanSteps} /> : null}
            {phase === "results" ? (
              <>
                <LinearGradient pointerEvents="none" colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.6)"]} style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 90 }} />
                <View style={{ position: "absolute", left: 12, right: 12, bottom: 12, flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                  {photoLabels.slice(0, MAX_LABELS).map((text, idx) => (
                    <Reveal key={`${text}-${idx}`} delay={500 + idx * 90}>
                      <PhotoLabel text={text} />
                    </Reveal>
                  ))}
                  {photoLabels.length > MAX_LABELS ? (
                    <Reveal delay={500 + MAX_LABELS * 90}><PhotoLabel text={`+${photoLabels.length - MAX_LABELS} more`} /></Reveal>
                  ) : null}
                </View>
              </>
            ) : null}
          </>
        ) : null}
      </Animated.View>

      {phase === "camera" ? (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: space(8), paddingTop: space(5), paddingBottom: space(4) }}>
          <RoundIcon icon="image" label="Choose from gallery" caption="Gallery" onPress={pickFromGallery} size={52} />
          <ShutterButton onPress={capture} busy={capturing || (!!permission?.granted && !cameraReady)} />
          <RoundIcon icon={switchAction.icon} label={switchAction.label} caption={switchAction.caption} onPress={switchAction.onPress} size={52} />
        </View>
      ) : null}

      {phase === "scanning" ? (
        <View style={{ alignItems: "center", paddingTop: space(5), paddingBottom: space(4), gap: 10 }}>
          <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 13 }}>This can take up to a minute</Text>
          <RoundIcon icon="x" label="Cancel scan" caption="Cancel" onPress={backToCamera} size={48} />
        </View>
      ) : null}

      {phase === "results" ? (
        <Animated.View style={{ flex: 1, marginTop: space(3), opacity: shrink, transform: [{ translateY: shrink.interpolate({ inputRange: [0, 1], outputRange: [60, 0] }) }] }}>
          <ScrollView
            style={{ flex: 1, backgroundColor: colors.bg, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg }}
            contentContainerStyle={{ padding: space(4), paddingBottom: space(8) }}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
          >
            {children}
          </ScrollView>
        </Animated.View>
      ) : null}

      <AppDialog dialog={error} onClose={() => setError(null)} />
    </SafeAreaView>
  );
}

function PhotoLabel({ text }: { text: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: colors.lime, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 }}>
      <Feather name="check" size={12} color={colors.onLime} />
      <Text style={{ color: colors.onLime, fontWeight: "700", fontSize: 12 }} numberOfLines={1}>{text}</Text>
    </View>
  );
}
