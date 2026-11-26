import { FontAwesome5 } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { ActivityIndicator, Image, Text, View } from "react-native";
import { showDialog } from "@/components/dialog";
import { Button, ErrorText, Field, Notice, Press, Reveal, Screen, Segmented, styles } from "@/components/ui";
import { useApp } from "@/lib/AppContext";
import { firebaseConfigured } from "@/lib/firebase";
import { PROVIDER_LABEL, useSocialSignIn, type SocialProvider } from "@/lib/oauth";
import { colors, radius, space } from "@/lib/theme";

const LEAF = require("../../../assets/splash-icon.png");

export default function Welcome() {
  const { signIn, signUp, resetPassword } = useApp();
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

  async function forgot() {
    setError(null);
    if (!email.trim()) {
      setError("Enter your email above, then tap Forgot password again.");
      return;
    }
    try {
      await resetPassword(email.trim());
      showDialog({ tone: "success", icon: "mail", title: "Check your email", message: `If ${email.trim()} has an account, a reset link is on its way.`, primary: { label: "OK", onPress: () => {} } });
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <Screen>
      {!firebaseConfigured ? <Notice>Sign-in isn't set up yet. Add the Firebase settings to App/.env and restart the app.</Notice> : null}
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
          <Text accessibilityRole="header" style={{ fontSize: 30, fontWeight: "900", color: colors.onHero, marginTop: 14 }}>FittonesuGo!</Text>
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

      {mode === "login" ? (
        <Press onPress={forgot} accessibilityLabel="Forgot password" style={{ alignSelf: "flex-end", minHeight: 36, justifyContent: "center", marginTop: -6 }}>
          <Text style={{ color: colors.primaryDark, fontWeight: "700" }}>Forgot password?</Text>
        </Press>
      ) : null}

      <ErrorText>{error}</ErrorText>
      <Button
        title={mode === "register" ? "Get started" : "Sign in"}
        onPress={submit}
        loading={loading}
        disabled={!email || password.length < (mode === "register" ? 8 : 1) || (mode === "register" && !name.trim())}
      />

      <Reveal delay={200}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginVertical: space(5) }}>
          <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
          <Text style={styles.muted}>or continue with</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
        </View>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <SocialButton provider="google" icon="google" color="#EA4335" />
          <SocialButton provider="facebook" icon="facebook" color="#1877F2" />
          <SocialButton provider="discord" icon="discord" color="#5865F2" />
        </View>
      </Reveal>
    </Screen>
  );
}

function SocialButton({ provider, icon, color }: { provider: SocialProvider; icon: string; color: string }) {
  const fail = (message: string) =>
    showDialog({ icon: "alert-circle", title: `${PROVIDER_LABEL[provider]} sign-in failed`, message, primary: { label: "OK", onPress: () => {} } });
  const s = useSocialSignIn(provider, fail);

  function press() {
    if (!s.configured) {
      showDialog({
        tone: "info",
        icon: "settings",
        title: `${PROVIDER_LABEL[provider]} sign-in isn't set up`,
        message: firebaseConfigured
          ? `Add the ${PROVIDER_LABEL[provider]} client ID to App/.env and restart the app. Use email for now.`
          : "Add the Firebase settings to App/.env and restart the app.",
        primary: { label: "OK", onPress: () => {} },
      });
      return;
    }
    s.start();
  }

  return (
    <Press
      onPress={press}
      disabled={s.busy}
      accessibilityLabel={`Continue with ${PROVIDER_LABEL[provider]}`}
      style={{ flex: 1, minHeight: 52, borderRadius: radius.pill, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, opacity: s.busy ? 0.6 : 1 }}
    >
      {s.busy ? <ActivityIndicator color={colors.text} /> : <FontAwesome5 name={icon} brand size={18} color={color} />}
      <Text style={{ color: colors.text, fontWeight: "700", fontSize: 14 }}>{PROVIDER_LABEL[provider]}</Text>
    </Press>
  );
}
