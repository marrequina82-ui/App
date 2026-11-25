import { Feather } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { Alert, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Chip, Section, SkeletonCard } from "@/components/nutrition";
import { Card, EmptyState, ErrorText, IconButton, IconTile, Press, Screen, styles, type IconName } from "@/components/ui";
import { api } from "@/lib/api";
import { useApp } from "@/lib/AppContext";
import { addDays, prettyDate, toISODate } from "@/lib/date";
import { openEntry } from "@/lib/navigation";
import { colors, minTouch, space } from "@/lib/theme";
import { MEALS, MEAL_LABEL, type DiaryEntry, type Meal } from "@/lib/types";

const MEAL_ICON: Record<Meal, IconName> = { breakfast: "sunrise", lunch: "sun", dinner: "moon", snacks: "coffee" };
const SOURCE_ICON: Record<DiaryEntry["source"], IconName> = { search: "search", ai_photo: "camera", label: "tag", quick: "zap" };

export default function Diary() {
  const { date, setDate, diaryVersion, targets } = useApp();
  const [entries, setEntries] = useState<DiaryEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setEntries(await api.diary(date));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [date]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => { load(); }, [diaryVersion, load]);

  const list = entries ?? [];
  const kcal = Math.round(list.reduce((s, e) => s + e.kcal, 0));
  const goal = targets?.calories ?? 2000;
  const isToday = date === toISODate();

  function remove(e: DiaryEntry) {
    Alert.alert("Remove entry?", `${e.name} · ${Math.round(e.kcal)} kcal`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: async () => { await api.deleteEntry(e.id); load(); } },
    ]);
  }

  return (
    <Screen>
      <Section>
        <Text accessibilityRole="header" style={[styles.title, { marginTop: space(2) }]}>Diary</Text>
      </Section>

      <Section delay={60}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginVertical: space(3) }}>
          <IconButton icon="chevron-left" label="Previous day" onPress={() => setDate(addDays(date, -1))} />
          <View style={{ alignItems: "center" }}>
            <Text style={[styles.h2, { marginBottom: 0 }]}>{prettyDate(date)}</Text>
            {isToday ? <Chip label="Today" tone="lime" /> : (
              <Press onPress={() => setDate(toISODate())} accessibilityLabel="Jump to today" style={{ minHeight: 32, justifyContent: "center" }}>
                <Text style={{ color: colors.primaryDark, fontWeight: "700" }}>Back to today</Text>
              </Press>
            )}
          </View>
          <IconButton icon="chevron-right" label="Next day" onPress={() => setDate(addDays(date, 1))} />
        </View>
      </Section>

      <Card style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View>
          <Text style={styles.muted}>Logged</Text>
          <Text style={{ fontSize: 26, fontWeight: "900", color: colors.text }}>{kcal} <Text style={{ fontSize: 15, color: colors.muted }}>kcal</Text></Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.muted}>Goal</Text>
          <Text style={{ fontSize: 18, fontWeight: "800", color: colors.primaryDark }}>{goal} kcal</Text>
        </View>
      </Card>

      <ErrorText>{error}</ErrorText>

      {entries === null ? (
        <SkeletonCard lines={2} />
      ) : list.length === 0 ? (
        <Section delay={120}>
          <EmptyState icon="book-open" title="No entries for this day" body="Add food to any meal below, or scan a meal from the Scan tab." />
        </Section>
      ) : null}

      {MEALS.map((meal, i) => {
        const items = list.filter((e) => e.meal === meal);
        const mealKcal = Math.round(items.reduce((s, e) => s + e.kcal, 0));
        return (
          <Section key={meal} delay={120 + i * 60}>
            <Card>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <IconTile name={MEAL_ICON[meal]} />
                <Text style={[styles.h2, { flex: 1, marginBottom: 0 }]}>{MEAL_LABEL[meal]}</Text>
                <Text style={styles.muted}>{mealKcal} kcal</Text>
              </View>

              {items.map((e) => (
                <View key={e.id} style={{ flexDirection: "row", alignItems: "center", marginTop: 6, paddingVertical: 6, borderTopWidth: 1, borderTopColor: colors.primarySoft }}>
                  <Press onPress={() => openEntry(e)} accessibilityLabel={`${e.name}, ${Math.round(e.kcal)} kcal. Open details`} style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <Feather name={SOURCE_ICON[e.source]} size={16} color={colors.muted} accessible={false} importantForAccessibility="no" />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.body, { fontWeight: "600" }]} numberOfLines={1}>{e.name}</Text>
                        <Text style={styles.muted} numberOfLines={1}>{e.amount_desc}</Text>
                      </View>
                      <Text style={[styles.body, { fontWeight: "800" }]}>{Math.round(e.kcal)}</Text>
                    </View>
                  </Press>
                  <IconButton icon="trash-2" label={`Remove ${e.name}`} color={colors.muted} onPress={() => remove(e)} />
                </View>
              ))}

              <Press
                onPress={() => router.navigate({ pathname: "/add", params: { meal } })}
                accessibilityLabel={`Add food to ${MEAL_LABEL[meal]}`}
                style={{ flexDirection: "row", alignItems: "center", gap: 8, minHeight: minTouch, marginTop: 4 }}
              >
                <Feather name="plus-circle" size={20} color={colors.primaryDark} accessible={false} importantForAccessibility="no" />
                <Text style={{ color: colors.primaryDark, fontWeight: "700", fontSize: 15 }}>Add food</Text>
              </Press>
            </Card>
          </Section>
        );
      })}
    </Screen>
  );
}
