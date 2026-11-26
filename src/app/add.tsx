import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { showDialog } from "@/components/dialog";
import { router, useLocalSearchParams } from "expo-router";
import { Button, Card, Field, IconTile, MealPicker, Press, Reveal, Screen, Title, styles, type IconName } from "@/components/ui";
import { api } from "@/lib/api";
import { useApp } from "@/lib/AppContext";
import { mealForNow, prettyDate } from "@/lib/date";
import { radius, space } from "@/lib/theme";
import { MEALS, type Meal } from "@/lib/types";

export default function AddFood() {
  const params = useLocalSearchParams<{ meal?: string }>();
  const { date, refreshDiary } = useApp();
  const [meal, setMeal] = useState<Meal>(mealForNow());
  const [quickName, setQuickName] = useState("");
  const [quickKcal, setQuickKcal] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (params.meal && (MEALS as string[]).includes(params.meal)) setMeal(params.meal as Meal);
  }, [params.meal]);

  const kcalNum = Number(quickKcal);
  const kcalError = quickKcal && (!Number.isFinite(kcalNum) || kcalNum <= 0 || kcalNum > 5000) ? "Enter calories between 1 and 5000." : null;

  async function quickAdd() {
    if (!kcalNum || kcalError) return;
    setSaving(true);
    try {
      await api.addEntries({ date, meal, name: quickName.trim() || "Quick add", amount_desc: "quick entry", kcal: Math.round(kcalNum), protein_g: 0, carbs_g: 0, fat_g: 0, source: "quick" });
      refreshDiary();
      setQuickName("");
      setQuickKcal("");
      showDialog({ tone: "success", icon: "check", title: "Added", message: `${Math.round(kcalNum)} kcal added to ${meal}.`, primary: { label: "Done", onPress: () => {} } });
    } catch (e) {
      showDialog({ icon: "alert-circle", title: "Couldn't add", message: (e as Error).message, primary: { label: "OK", onPress: () => {} } });
    } finally {
      setSaving(false);
    }
  }

  const go = (pathname: "/scan/meal" | "/scan/label" | "/food/search") => router.push({ pathname, params: { meal } });

  return (
    <Screen>
      <Reveal>
        <Title sub={`Adding to ${prettyDate(date)}`}>Log food</Title>
      </Reveal>
      <Reveal delay={60}>
        <MealPicker value={meal} onChange={setMeal} />
      </Reveal>

      <Reveal delay={120}>
        <Option icon="camera" title="AI meal scanner" desc="Photo plus weight. AI estimates calories and macros." onPress={() => go("/scan/meal")} />
      </Reveal>
      <Reveal delay={180}>
        <Option icon="tag" title="Nutrition label" desc="Read a Nutrition Facts panel, then review it before saving." onPress={() => go("/scan/label")} />
      </Reveal>
      <Reveal delay={240}>
        <Option icon="search" title="Search foods" desc="Filipino dishes, staples and your saved label foods." onPress={() => go("/food/search")} />
      </Reveal>

      <Reveal delay={300}>
        <Card style={{ marginTop: space(2) }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <IconTile name="zap" tone="accent" />
            <View style={{ flex: 1 }}>
              <Text style={styles.h2}>Quick add calories</Text>
              <Text style={styles.muted}>For when you know the calories but not the food.</Text>
            </View>
          </View>
          <Field label="Name (optional)" value={quickName} onChangeText={setQuickName} placeholder="e.g. Office merienda" />
          <Field label="Calories (kcal)" value={quickKcal} onChangeText={setQuickKcal} keyboardType="number-pad" placeholder="250" error={kcalError} />
          <Button title="Add calories" variant="secondary" onPress={quickAdd} loading={saving} disabled={!kcalNum || !!kcalError} />
        </Card>
      </Reveal>
    </Screen>
  );
}

function Option({ icon, title, desc, onPress }: { icon: IconName; title: string; desc: string; onPress: () => void }) {
  return (
    <Press onPress={onPress} accessibilityLabel={`${title}. ${desc}`} style={{ marginBottom: space(3) }}>
      <Card style={{ marginBottom: 0, flexDirection: "row", gap: 14, alignItems: "center", borderRadius: radius.md }}>
        <IconTile name={icon} size={50} />
        <View style={{ flex: 1 }}>
          <Text style={styles.h2}>{title}</Text>
          <Text style={styles.muted}>{desc}</Text>
        </View>
      </Card>
    </Press>
  );
}
