import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useState } from "react";
import { Platform, Text, View } from "react-native";
import { showDialog } from "@/components/dialog";
import { Avatar } from "@/components/nutrition";
import { Button, Card, Press, Reveal, Screen, styles } from "@/components/ui";
import { useApp } from "@/lib/AppContext";
import { AVATAR_PRESETS } from "@/lib/avatars";
import { pickAvatarPhoto } from "@/lib/image";
import { colors, radius, space } from "@/lib/theme";

export default function AvatarPicker() {
  const { user, setAvatar } = useApp();
  const [choice, setChoice] = useState<string | null>(user?.avatar ?? null);
  const [saving, setSaving] = useState(false);

  async function upload(source: "camera" | "library") {
    try {
      const photo = await pickAvatarPhoto(source);
      if (photo) setChoice(photo);
    } catch (e) {
      showDialog({ icon: "image", title: "Couldn't get photo", message: (e as Error).message, primary: { label: "OK", onPress: () => {} } });
    }
  }

  async function save() {
    setSaving(true);
    try {
      await setAvatar(choice);
      router.back();
    } catch (e) {
      showDialog({ icon: "alert-circle", title: "Couldn't save picture", message: (e as Error).message, primary: { label: "OK", onPress: () => {} } });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen edges={["bottom"]}>
      <Reveal style={{ alignItems: "center", marginBottom: space(5) }}>
        <Avatar name={user?.name} avatar={choice} size={120} />
        <Text style={[styles.h2, { marginTop: space(3), marginBottom: 0 }]}>{user?.name}</Text>
        <Text style={styles.muted}>Preview</Text>
      </Reveal>

      <Reveal delay={60}>
        <Card>
          <Text style={styles.h2}>Your photo</Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}><Button title="Upload" icon="upload" variant="secondary" onPress={() => upload("library")} /></View>
            {Platform.OS !== "web" ? <View style={{ flex: 1 }}><Button title="Take photo" icon="camera" variant="secondary" onPress={() => upload("camera")} /></View> : null}
          </View>
        </Card>
      </Reveal>

      <Reveal delay={120}>
        <Card>
          <Text style={styles.h2}>Or pick an avatar</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "space-between" }}>
            {AVATAR_PRESETS.map((p) => {
              const id = `preset:${p.id}`;
              const active = choice === id;
              return (
                <Press
                  key={p.id}
                  onPress={() => setChoice(id)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`${p.id} avatar`}
                  style={{ width: "21%", aspectRatio: 1, borderRadius: radius.pill, borderWidth: 3, borderColor: active ? colors.primary : "transparent", padding: 3 }}
                >
                  <LinearGradient colors={p.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" }}>
                    <Feather name={p.icon} size={24} color="#0B0F0C" />
                  </LinearGradient>
                </Press>
              );
            })}
          </View>
        </Card>
      </Reveal>

      <Reveal delay={180}>
        <Button title="Save picture" icon="check" onPress={save} loading={saving} disabled={choice === (user?.avatar ?? null)} />
        {choice ? <Button title="Use initials instead" variant="ghost" onPress={() => setChoice(null)} /> : null}
      </Reveal>
    </Screen>
  );
}
