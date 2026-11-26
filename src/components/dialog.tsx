import { Feather } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { Animated, Modal, Text, View } from "react-native";
import { Button, useReduceMotion, type IconName } from "./ui";
import { colors, radius, useNativeDriver } from "@/lib/theme";

export type DialogTone = "danger" | "info" | "success";

export interface DialogSpec {
  icon: IconName;
  title: string;
  message: string;
  tone?: DialogTone;
  primary: { label: string; onPress: () => void; destructive?: boolean };
  secondary?: { label: string; onPress: () => void };
  /** Runs when closed with the Android back button. */
  onDismiss?: () => void;
}

const tones = (): Record<DialogTone, { bg: string; fg: string }> => ({
  danger: { bg: colors.dangerSoft, fg: colors.danger },
  info: { bg: colors.primarySoft, fg: colors.primaryDark },
  success: { bg: colors.primarySoft, fg: colors.primaryDark },
});

/** Centered pop-up that springs in. Replaces the OS alert so dialogs match the app. */
export function AppDialog({ dialog, onClose }: { dialog: DialogSpec | null; onClose: () => void }) {
  const reduce = useReduceMotion();
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!dialog) return;
    v.setValue(reduce ? 1 : 0);
    if (!reduce) Animated.spring(v, { toValue: 1, friction: 7, tension: 90, useNativeDriver }).start();
  }, [dialog, reduce, v]);

  const tone = tones()[dialog?.tone ?? "danger"];

  return (
    <Modal visible={!!dialog} transparent animationType="fade" onRequestClose={() => { onClose(); dialog?.onDismiss?.(); }} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.65)", alignItems: "center", justifyContent: "center", padding: 24 }}>
        {dialog ? (
          <Animated.View
            accessibilityViewIsModal
            style={{
              width: "100%", maxWidth: 360, backgroundColor: colors.card, borderRadius: radius.lg, padding: 24, alignItems: "center",
              borderWidth: 1, borderColor: colors.border,
              opacity: v,
              transform: [
                { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) },
                { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) },
              ],
            }}
          >
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: tone.bg, alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <Feather name={dialog.icon} size={28} color={tone.fg} />
            </View>
            <Text accessibilityRole="header" style={{ fontSize: 20, fontWeight: "800", color: colors.text, textAlign: "center" }}>{dialog.title}</Text>
            <Text style={{ fontSize: 15, color: colors.muted, textAlign: "center", lineHeight: 21, marginTop: 8, marginBottom: 20 }}>{dialog.message}</Text>
            <View style={{ alignSelf: "stretch", gap: 4 }}>
              <Button
                title={dialog.primary.label}
                variant={dialog.primary.destructive ? "danger" : "primary"}
                onPress={() => { onClose(); dialog.primary.onPress(); }}
              />
              {dialog.secondary ? <Button title={dialog.secondary.label} variant="ghost" onPress={() => { onClose(); dialog.secondary!.onPress(); }} /> : null}
            </View>
          </Animated.View>
        ) : null}
      </View>
    </Modal>
  );
}

let open: ((d: DialogSpec) => void) | null = null;

/** Shows a dialog from anywhere. Needs <DialogHost /> mounted once at the root. */
export function showDialog(d: DialogSpec) {
  open?.(d);
}

export function DialogHost() {
  const [dialog, setDialog] = useState<DialogSpec | null>(null);
  useEffect(() => {
    open = setDialog;
    return () => { open = null; };
  }, []);
  return <AppDialog dialog={dialog} onClose={() => setDialog(null)} />;
}
