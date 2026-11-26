import { useEffect, useState } from "react";
import { Switch, Text, View } from "react-native";
import { showDialog } from "@/components/dialog";
import { Card, IconButton, IconTile, Notice, Reveal, Screen, Title, styles, type IconName } from "@/components/ui";
import { applyReminders, formatTime, loadReminders, REMINDER_KEYS, remindersSupported, type ReminderKey, type Reminders } from "@/lib/reminders";
import { colors, space } from "@/lib/theme";

const META: Record<ReminderKey, { icon: IconName; label: string }> = {
  weigh_in: { icon: "trending-down", label: "Morning weigh-in" },
  breakfast: { icon: "sunrise", label: "Breakfast" },
  lunch: { icon: "sun", label: "Lunch" },
  dinner: { icon: "moon", label: "Dinner" },
};

export default function NotificationSettings() {
  const [reminders, setReminders] = useState<Reminders | null>(null);

  useEffect(() => { loadReminders().then(setReminders); }, []);

  async function update(next: Reminders) {
    const prev = reminders;
    setReminders(next);
    try {
      const ok = await applyReminders(next);
      if (!ok) {
        setReminders(prev);
        showDialog({
          icon: "bell-off",
          title: "Notifications are off",
          message: "Allow notifications for FittonesuGo in your phone's Settings, then turn reminders on here.",
          primary: { label: "OK", onPress: () => {} },
        });
      }
    } catch (e) {
      setReminders(prev);
      const msg = (e as Error).message ?? "";
      const notLinked = /not available|native module|linked|ExpoNotifications/i.test(msg);
      showDialog({
        icon: "alert-circle",
        title: "Couldn't set reminder",
        message: notLinked
          ? "This build of the app doesn't include notifications yet. Rebuild the app (npx expo run:android or a new EAS development build), then try again."
          : msg || "Something went wrong while scheduling the reminder.",
        primary: { label: "OK", onPress: () => {} },
      });
    }
  }

  function shift(k: ReminderKey, minutes: number) {
    if (!reminders) return;
    const total = (reminders[k].hour * 60 + reminders[k].minute + minutes + 1440) % 1440;
    update({ ...reminders, [k]: { ...reminders[k], hour: Math.floor(total / 60), minute: total % 60 } });
  }

  return (
    <Screen edges={["bottom"]}>
      <Reveal>
        <Title sub="Daily nudges to log meals and weigh in. They're saved on this phone.">Reminders</Title>
      </Reveal>
      {!remindersSupported ? <Notice>Reminders work in the phone app. They aren't available in the web version.</Notice> : null}
      {reminders && remindersSupported
        ? REMINDER_KEYS.map((k, i) => {
            const r = reminders[k];
            return (
              <Reveal key={k} delay={60 + i * 60}>
                <Card>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <IconTile name={META[k].icon} size={42} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.h2, { marginBottom: 0 }]}>{META[k].label}</Text>
                      <Text style={styles.muted}>{r.on ? `Every day at ${formatTime(r.hour, r.minute)}` : "Off"}</Text>
                    </View>
                    <Switch
                      value={r.on}
                      onValueChange={(on) => update({ ...reminders, [k]: { ...r, on } })}
                      trackColor={{ false: colors.primarySoft, true: colors.primary }}
                      thumbColor={r.on ? colors.onPrimary : colors.muted}
                      accessibilityLabel={`${META[k].label} reminder`}
                    />
                  </View>
                  {r.on ? (
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: space(3), paddingTop: space(3), borderTopWidth: 1, borderTopColor: colors.border }}>
                      <IconButton icon="minus" label={`Earlier ${META[k].label} reminder`} onPress={() => shift(k, -15)} />
                      <Text style={{ color: colors.primaryDark, fontSize: 22, fontWeight: "800" }}>{formatTime(r.hour, r.minute)}</Text>
                      <IconButton icon="plus" label={`Later ${META[k].label} reminder`} onPress={() => shift(k, 15)} />
                    </View>
                  ) : null}
                </Card>
              </Reveal>
            );
          })
        : null}
    </Screen>
  );
}
