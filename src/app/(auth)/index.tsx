import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { Image, Text, View } from "react-native";
import { Button, ErrorText, Field, Reveal, Screen, Segmented, styles } from "@/components/ui";
import { useApp } from "@/lib/AppContext";
import { colors, radius } from "@/lib/theme";

const LEAF = require("../../../assets/splash-icon.png");

export default function Welcome() {
  const { signIn, signUp } = useApp();
  const [mode, setMode] = useState<"login" | "register">("register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setLoading(true);
    try {
      if (mode === "register") await signUp(name.trim(), email.trim(), password);
      else await signIn(email.trim(), password);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <Reveal>
        <LinearGradient
          colors={[colors.heroTop, colors.heroBottom]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ alignItems: "center", borderRadius: radius.lg, paddingVertical: 28, paddingHorizontal: 20, marginTop: 8, marginBottom: 24 }}
        >
          <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" }}>
            <Image source={LEAF} style={{ width: 64, height: 64 }} resizeMode="contain" accessible={false} />
          </View>
          <Text accessibilityRole="header" style={{ fontSize: 30, fontWeight: "900", color: colors.onPrimary, marginTop: 14 }}>FittonesuGo!</Text>
          <Text style={{ fontSize: 16, color: colors.onHeroMuted, textAlign: "center", marginTop: 6, lineHeight: 22 }}>
            Your smart fitness buddy, one step at a time.
          </Text>
        </LinearGradient>
      </Reveal>

      <Reveal delay={80}>
        <Segmented
          label="Account"
          options={[{ label: "Create account", value: "register" }, { label: "Sign in", value: "login" }]}
          value={mode}
          onChange={(m) => { setMode(m); setError(null); }}
          fullWidth
        />
      </Reveal>

      <Reveal delay={140}>
        {mode === "register" && <Field label="Name" value={name} onChangeText={setName} placeholder="Your first name" autoCapitalize="words" autoComplete="name" textContentType="name" />}
        <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@email.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" />
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="At least 8 characters"
          secureTextEntry
          autoComplete={mode === "register" ? "new-password" : "current-password"}
          textContentType={mode === "register" ? "newPassword" : "password"}
          hint={mode === "register" ? "8+ characters. Password managers can fill this in." : undefined}
        />
      </Reveal>

      <ErrorText>{error}</ErrorText>
      <Button
        title={mode === "register" ? "Get started" : "Sign in"}
        onPress={submit}
        loading={loading}
        disabled={!email || password.length < (mode === "register" ? 8 : 1) || (mode === "register" && !name.trim())}
      />
    </Screen>
  );
}
