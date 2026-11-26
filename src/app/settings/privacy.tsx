import { useState } from "react";
import { Platform, Share, Text, View } from "react-native";
import { showDialog } from "@/components/dialog";
import { Button, Card, Field, IconTile, Reveal, Screen, Title, styles, type IconName } from "@/components/ui";
import { api } from "@/lib/api";
import { useApp } from "@/lib/AppContext";
import { toISODate } from "@/lib/date";
import { space } from "@/lib/theme";

export default function Privacy() {
  const { hasPassword, refreshDiary, deleteAccount } = useApp();
  const [exporting, setExporting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [password, setPassword] = useState("");
  const [deleting, setDeleting] = useState(false);

  const fail = (title: string) => (e: unknown) =>
    showDialog({ icon: "alert-circle", title, message: (e as Error).message, primary: { label: "OK", onPress: () => {} } });

  async function exportData() {
    setExporting(true);
    try {
      const json = JSON.stringify(await api.exportData(), null, 2);
      const filename = `fittonesugo-export-${toISODate()}.json`;
      if (Platform.OS === "web") {
        const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        await Share.share({ title: filename, message: json });
      }
    } catch (e) {
      fail("Export failed")(e);
    } finally {
      setExporting(false);
    }
  }

  function clearDiary() {
    showDialog({
      icon: "trash-2",
      title: "Clear your whole diary?",
      message: "Every logged meal on every day will be deleted. Your profile, goals and weight history stay. This can't be undone.",
      primary: {
        label: "Clear diary",
        destructive: true,
        onPress: async () => {
          setClearing(true);
          try {
            const r = await api.clearDiary();
            refreshDiary();
            showDialog({ tone: "success", icon: "check", title: "Diary cleared", message: `${r.deleted} entries deleted.`, primary: { label: "Done", onPress: () => {} } });
          } catch (e) {
            fail("Couldn't clear diary")(e);
          } finally {
            setClearing(false);
          }
        },
      },
      secondary: { label: "Cancel", onPress: () => {} },
    });
  }

  function removeAccount() {
    showDialog({
      icon: "user-x",
      title: "Delete your account?",
      message: "Your account, profile, diary, weights and saved foods will be permanently deleted. This can't be undone.",
      primary: {
        label: "Delete account",
        destructive: true,
        onPress: async () => {
          setDeleting(true);
          try {
            await deleteAccount(hasPassword ? password : undefined);
          } catch (e) {
            fail("Couldn't delete account")(e);
            setDeleting(false);
          }
        },
      },
      secondary: { label: "Cancel", onPress: () => {} },
    });
  }

  return (
    <Screen edges={["bottom"]}>
      <Reveal>
        <Title sub="Your data is stored on your FittonesuGo server. Photos you scan are sent to the AI for analysis and aren't saved.">Privacy & data</Title>
      </Reveal>

      <Reveal delay={60}>
        <Section icon="download" title="Export my data" body="Get a copy of your profile, diary, weights and saved foods as a JSON file.">
          <Button title="Export data" icon="share" variant="secondary" onPress={exportData} loading={exporting} />
        </Section>
      </Reveal>

      <Reveal delay={120}>
        <Section icon="book-open" title="Clear diary" body="Delete every meal you've logged. Goals and weight history stay.">
          <Button title="Clear diary" icon="trash-2" variant="danger" onPress={clearDiary} loading={clearing} />
        </Section>
      </Reveal>

      <Reveal delay={180}>
        <Section icon="user-x" title="Delete account" body={`Permanently remove your account and everything in it. ${hasPassword ? "Enter your password" : "Type DELETE"} to confirm.`}>
          {hasPassword ? (
            <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" textContentType="password" />
          ) : (
            <Field label="Type DELETE" value={password} onChangeText={setPassword} autoCapitalize="characters" placeholder="DELETE" />
          )}
          <Button title="Delete account" icon="user-x" variant="danger" onPress={removeAccount} loading={deleting} disabled={hasPassword ? !password : password.trim().toUpperCase() !== "DELETE"} />
        </Section>
      </Reveal>
    </Screen>
  );
}

function Section({ icon, title, body, children }: { icon: IconName; title: string; body: string; children: React.ReactNode }) {
  return (
    <Card>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: space(2) }}>
        <IconTile name={icon} size={42} />
        <Text style={[styles.h2, { flex: 1, marginBottom: 0 }]}>{title}</Text>
      </View>
      <Text style={[styles.muted, { marginBottom: space(2) }]}>{body}</Text>
      {children}
    </Card>
  );
}
