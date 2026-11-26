import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { showDialog } from "@/components/dialog";
import { Button, Card, EmptyState, ErrorText, IconTile, Notice, Reveal, Screen, Title, styles } from "@/components/ui";
import { Chip } from "@/components/nutrition";
import { api } from "@/lib/api";
import { useApp } from "@/lib/AppContext";
import { colors, radius, space } from "@/lib/theme";
import { MEAL_LABEL, type DiaryEntry } from "@/lib/types";

const SOURCE_LABEL: Record<DiaryEntry["source"], string> = { search: "From food database", ai_photo: "AI photo estimate", label: "From nutrition label", quick: "Quick add" };

/** Share of calories from each macro, using 4/4/9 kcal per gram. */
function split(e: DiaryEntry) {
  const p = e.protein_g * 4, c = e.carbs_g * 4, f = e.fat_g * 9;
  const sum = p + c + f;
  const pct = (x: number) => (sum > 0 ? Math.round((x / sum) * 100) : 0);
  return { p: pct(p), c: pct(c), f: pct(f) };
}

export default function MealDetail() {
  const params = useLocalSearchParams<{ id: string; data?: string }>();
  const { refreshDiary } = useApp();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const entry = useMemo<DiaryEntry | null>(() => {
    try { return params.data ? (JSON.parse(params.data) as DiaryEntry) : null; } catch { return null; }
  }, [params.data]);

  if (!entry) {
    return (
      <Screen>
        <EmptyState icon="alert-circle" title="Entry not found" body="It may have been removed. Go back to your diary." />
        <Button title="Back to diary" variant="secondary" icon="chevron-left" onPress={() => router.back()} />
      </Screen>
    );
  }

  const shares = split(entry);

  function remove() {
    showDialog({
      icon: "trash-2",
      title: "Remove from diary?",
      message: `${entry!.name} · ${Math.round(entry!.kcal)} kcal`,
      primary: {
        label: "Remove",
        destructive: true,
        onPress: async () => {
          setBusy(true);
          setError(null);
          try {
            await api.deleteEntry(entry!.id);
            refreshDiary();
            router.back();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        },
      },
      secondary: { label: "Cancel", onPress: () => {} },
    });
  }

  return (
    <Screen>
      <Reveal>
      <LinearGradient
        colors={[colors.heroTop, colors.heroBottom]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: radius.lg, padding: space(5), marginTop: space(2), marginBottom: space(4) }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Chip label={MEAL_LABEL[entry.meal]} tone="lime" />
          <Chip label={SOURCE_LABEL[entry.source]} />
        </View>
        <Text accessibilityRole="header" style={{ fontSize: 24, fontWeight: "800", color: colors.onHero }}>{entry.name}</Text>
        <Text style={{ fontSize: 15, color: colors.onHeroMuted, marginTop: 4 }}>{entry.amount_desc}</Text>
        <View style={{ flexDirection: "row", alignItems: "flex-end", marginTop: space(4) }}>
          <Text style={{ fontSize: 44, fontWeight: "900", color: colors.lime }}>{Math.round(entry.kcal)}</Text>
          <Text style={{ fontSize: 16, color: colors.onHeroMuted, marginBottom: 8, marginLeft: 6 }}>kcal</Text>
        </View>
      </LinearGradient>
      </Reveal>

      <Reveal delay={80}>
        <Title sub="Grams and macros as logged.">Nutrition</Title>
        <Card>
          <MacroBlock label="Protein" grams={entry.protein_g} share={shares.p} color={colors.protein} fill={colors.proteinFill} />
          <MacroBlock label="Carbohydrates" grams={entry.carbs_g} share={shares.c} color={colors.carbs} fill={colors.carbsFill} />
          <MacroBlock label="Fat" grams={entry.fat_g} share={shares.f} color={colors.fat} fill={colors.fatFill} />
        </Card>
      </Reveal>

      <Reveal delay={160}>
        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <IconTile name="info" size={40} />
            <Text style={[styles.muted, { flex: 1 }]}>
              Ingredient lists aren't stored with diary entries yet, so this screen shows the logged amount and nutrition only.
            </Text>
          </View>
        </Card>
      </Reveal>

      <Notice>Values are estimates from the source you logged them with. Check labels for exact amounts.</Notice>
      <ErrorText>{error}</ErrorText>
      <Button title="Remove from diary" variant="danger" icon="trash-2" onPress={remove} loading={busy} />
      <Button title="Back" variant="ghost" icon="chevron-left" onPress={() => router.back()} />
    </Screen>
  );
}

function MacroBlock({ label, grams, share, color, fill }: { label: string; grams: number; share: number; color: string; fill: string }) {
  return (
    <View style={{ marginBottom: 14 }} accessibilityLabel={`${label} ${Math.round(grams)} grams, ${share} percent of calories`}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
        <Text style={[styles.body, { fontWeight: "700" }]}>{label}</Text>
        <Text style={{ color, fontWeight: "700" }}>{Math.round(grams)} g · {share}%</Text>
      </View>
      <View style={{ height: 10, backgroundColor: colors.primarySoft, borderRadius: 5, overflow: "hidden" }}>
        <View style={{ width: `${share}%`, height: "100%", backgroundColor: fill, borderRadius: 5 }} />
      </View>
    </View>
  );
}
