import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { CalorieRing } from "@/components/CalorieRing";
import { Avatar, QuickAction, Section, SectionTitle, Skeleton, SkeletonCard } from "@/components/nutrition";
import { Card, EmptyState, ErrorText, IconTile, Press, ProgressBar, Screen, styles } from "@/components/ui";
import { api } from "@/lib/api";
import { useApp } from "@/lib/AppContext";
import { prettyDate, toISODate } from "@/lib/date";
import { colors, minTouch, radius, space } from "@/lib/theme";
import { MEAL_LABEL, type DiaryEntry, type Meal } from "@/lib/types";
import { openEntry } from "@/lib/navigation";

const SOURCE_LABEL: Record<DiaryEntry["source"], string> = { search: "Database", ai_photo: "AI photo", label: "Label", quick: "Quick add" };

function greeting(d = new Date()) {
  const h = d.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function Home() {
  const { user, targets, diaryVersion } = useApp();
  const [entries, setEntries] = useState<DiaryEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const today = toISODate();

  const load = useCallback(async () => {
    try {
      setError(null);
      setEntries(await api.diary(today));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [today]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => { load(); }, [diaryVersion, load]);

  const list = entries ?? [];
  const total = list.reduce(
    (t, e) => ({ kcal: t.kcal + e.kcal, p: t.p + e.protein_g, c: t.c + e.carbs_g, f: t.f + e.fat_g }),
    { kcal: 0, p: 0, c: 0, f: 0 }
  );
  const goal = targets?.calories ?? 2000;
  const eaten = Math.round(total.kcal);
  const remaining = goal - eaten;
  const firstName = user?.name?.split(" ")[0] ?? "there";
  const recent = [...list].sort((a, b) => b.id - a.id).slice(0, 4);

  return (
    <Screen>
      <Section>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: space(1) }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.muted}>{greeting()}</Text>
            <Text accessibilityRole="header" style={{ fontSize: 26, fontWeight: "800", color: colors.text }}>Hi, {firstName}</Text>
          </View>
          <Pressable onPress={() => router.navigate("/profile")} accessibilityRole="button" accessibilityLabel="Open profile" style={{ minHeight: minTouch, minWidth: minTouch, alignItems: "center", justifyContent: "center" }}>
            <Avatar name={user?.name} />
          </Pressable>
        </View>
        <Text style={[styles.muted, { marginTop: 4 }]}>{prettyDate(today)}</Text>
      </Section>

      <ErrorText>{error}</ErrorText>

      <Section delay={80}>
        <LinearGradient
          colors={[colors.heroTop, colors.heroBottom]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: radius.lg, padding: space(5), marginTop: space(4), marginBottom: space(3) }}
        >
          <Text style={{ color: colors.onHeroMuted, fontWeight: "700", fontSize: 13, letterSpacing: 0.4 }}>DAILY CALORIES</Text>
          {entries === null ? (
            <View style={{ alignItems: "center", paddingVertical: 40 }}><Skeleton width={180} height={180} radiusSize={90} /></View>
          ) : (
            <View style={{ alignItems: "center", marginTop: space(3) }}>
              <CalorieRing eaten={total.kcal} goal={goal} onDark size={200} />
            </View>
          )}
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: space(4) }}>
            <HeroStat label="Goal" value={goal} />
            <HeroStat label="Eaten" value={eaten} />
            <HeroStat label={remaining < 0 ? "Over" : "Remaining"} value={Math.abs(remaining)} emphasis />
          </View>
        </LinearGradient>
      </Section>

      <Section delay={140}>
        <Card>
          <Text style={[styles.h2, { marginBottom: 12 }]}>Macros today</Text>
          <MacroLine label="Protein" value={total.p} max={targets?.protein_g ?? 0} color={colors.proteinFill} textColor={colors.protein} />
          <MacroLine label="Carbs" value={total.c} max={targets?.carbs_g ?? 0} color={colors.carbsFill} textColor={colors.carbs} />
          <MacroLine label="Fat" value={total.f} max={targets?.fat_g ?? 0} color={colors.fatFill} textColor={colors.fat} />
        </Card>
      </Section>

      <SectionTitle>Quick actions</SectionTitle>
      <Section delay={200}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          <QuickAction icon="camera" label="AI meal scan" hint="Photo + weight" tone="solid" onPress={() => router.navigate("/scan/meal")} />
          <QuickAction icon="tag" label="Scan label" hint="Nutrition facts" onPress={() => router.navigate("/scan/label")} />
          <QuickAction icon="plus-circle" label="Add food" hint="Search or quick add" onPress={() => router.navigate("/add")} />
          <QuickAction icon="activity" label="Log exercise" hint="Coming soon" onPress={() => Alert.alert("Exercise logging", "Exercise logging isn't connected yet. It will add burned calories to your day when it is.")} />
        </View>
      </Section>

      <SectionTitle action={list.length ? "Diary" : undefined} onAction={() => router.navigate("/diary")}>Recent meals</SectionTitle>
      {entries === null ? (
        <SkeletonCard lines={2} />
      ) : recent.length === 0 ? (
        <Section delay={260}>
          <EmptyState icon="sunrise" title="Nothing logged yet" body="Scan a meal or add food to start today's log." />
        </Section>
      ) : (
        recent.map((e, i) => (
          <Section key={e.id} delay={260 + i * 60}>
            <Press onPress={() => openEntry(e)} accessibilityLabel={`${e.name}, ${Math.round(e.kcal)} kcal, ${MEAL_LABEL[e.meal]}. Open details`} style={{ marginBottom: space(2) }}>
              <Card style={{ marginBottom: 0, flexDirection: "row", alignItems: "center", gap: 12 }}>
                <IconTile name={e.source === "ai_photo" ? "camera" : e.source === "label" ? "tag" : e.source === "quick" ? "zap" : "search"} size={44} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.body, { fontWeight: "700" }]} numberOfLines={1}>{e.name}</Text>
                  <Text style={styles.muted} numberOfLines={1}>{MEAL_LABEL[e.meal as Meal]} · {SOURCE_LABEL[e.source]}</Text>
                </View>
                <Text style={{ fontSize: 18, fontWeight: "800", color: colors.text }}>{Math.round(e.kcal)}</Text>
                <Feather name="chevron-right" size={20} color={colors.muted} accessible={false} importantForAccessibility="no" />
              </Card>
            </Press>
          </Section>
        ))
      )}
    </Screen>
  );
}

function HeroStat({ label, value, emphasis }: { label: string; value: number; emphasis?: boolean }) {
  return (
    <View accessibilityLabel={`${label} ${value} kcal`}>
      <Text style={{ fontSize: emphasis ? 22 : 18, fontWeight: "800", color: emphasis ? colors.lime : colors.onPrimary }}>{value}</Text>
      <Text style={{ fontSize: 13, color: colors.onHeroMuted }}>{label}</Text>
    </View>
  );
}

function MacroLine({ label, value, max, color, textColor }: { label: string; value: number; max: number; color: string; textColor: string }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
        <Text style={[styles.body, { fontWeight: "600" }]}>{label}</Text>
        <Text style={[styles.muted, { color: textColor, fontWeight: "700" }]}>{Math.round(value)} / {max} g</Text>
      </View>
      <ProgressBar value={value} max={max} color={color} label={`${label} progress`} />
    </View>
  );
}
