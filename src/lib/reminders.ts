import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export type ReminderKey = "breakfast" | "lunch" | "dinner" | "weigh_in";
export interface Reminder { on: boolean; hour: number; minute: number }
export type Reminders = Record<ReminderKey, Reminder>;

export const REMINDER_KEYS: ReminderKey[] = ["weigh_in", "breakfast", "lunch", "dinner"];

export const DEFAULT_REMINDERS: Reminders = {
  weigh_in: { on: false, hour: 7, minute: 0 },
  breakfast: { on: false, hour: 8, minute: 0 },
  lunch: { on: false, hour: 12, minute: 30 },
  dinner: { on: false, hour: 19, minute: 0 },
};

const MESSAGE: Record<ReminderKey, { title: string; body: string }> = {
  weigh_in: { title: "Morning weigh-in", body: "Log today's weight to keep your progress chart up to date." },
  breakfast: { title: "Log your breakfast", body: "Snap your plate so FittonesuGo can count it." },
  lunch: { title: "Log your lunch", body: "A quick photo keeps today's calories accurate." },
  dinner: { title: "Log your dinner", body: "Add dinner to finish today's diary." },
};

const KEY = "fittonesugo_reminders";
const CHANNEL = "reminders";

export const remindersSupported = Platform.OS !== "web";

export function initReminders() {
  if (!remindersSupported) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
}

export async function loadReminders(): Promise<Reminders> {
  try {
    const raw = remindersSupported ? await SecureStore.getItemAsync(KEY) : null;
    return raw ? { ...DEFAULT_REMINDERS, ...(JSON.parse(raw) as Partial<Reminders>) } : DEFAULT_REMINDERS;
  } catch {
    return DEFAULT_REMINDERS;
  }
}

/** Saves the settings and reschedules every daily reminder. Returns false if notification permission is denied. */
export async function applyReminders(r: Reminders): Promise<boolean> {
  if (!remindersSupported) return false;
  const anyOn = REMINDER_KEYS.some((k) => r[k].on);
  if (anyOn) {
    const current = await Notifications.getPermissionsAsync();
    const granted = current.granted || (await Notifications.requestPermissionsAsync()).granted;
    if (!granted) return false;
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync(CHANNEL, { name: "Meal reminders", importance: Notifications.AndroidImportance.DEFAULT });
    }
  }
  await SecureStore.setItemAsync(KEY, JSON.stringify(r));
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const k of REMINDER_KEYS) {
    if (!r[k].on) continue;
    await Notifications.scheduleNotificationAsync({
      identifier: k,
      content: MESSAGE[k],
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: r[k].hour, minute: r[k].minute, channelId: CHANNEL },
    });
  }
  return true;
}

export function formatTime(hour: number, minute: number) {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${String(minute).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`;
}
