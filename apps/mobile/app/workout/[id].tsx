import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { MUSCLE_GROUP_LABELS, type WorkoutPlanExercise } from "@ptapp/shared";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { colors } from "@/lib/theme";

type SetState = { reps_done: string; load_kg_done: string; completed: boolean };

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const navigation = useNavigation();

  const [planName, setPlanName] = useState("");
  const [items, setItems] = useState<WorkoutPlanExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [logId, setLogId] = useState<string | null>(null);
  const [setState, setSetState] = useState<Record<string, SetState[]>>({});
  const [saving, setSaving] = useState(false);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: plan } = await supabase
        .from("workout_plans")
        .select("name")
        .eq("id", id)
        .single();
      if (plan) {
        setPlanName(plan.name);
        navigation.setOptions({ headerTitle: plan.name });
      }

      const { data: planExercises } = await supabase
        .from("workout_plan_exercises")
        .select("*, exercise:exercises(*)")
        .eq("workout_plan_id", id)
        .order("order_index");

      const list = planExercises ?? [];
      setItems(list);

      const initial: Record<string, SetState[]> = {};
      for (const item of list) {
        initial[item.id] = Array.from({ length: item.sets }, () => ({
          reps_done: "",
          load_kg_done: item.load_kg ? String(item.load_kg) : "",
          completed: false,
        }));
      }
      setSetState(initial);
      setLoading(false);
    }
    load();
  }, [id]);

  function updateSet(exerciseItemId: string, setIndex: number, patch: Partial<SetState>) {
    setSetState((prev) => ({
      ...prev,
      [exerciseItemId]: prev[exerciseItemId].map((s, i) =>
        i === setIndex ? { ...s, ...patch } : s
      ),
    }));
  }

  async function ensureLog() {
    if (logId) return logId;
    if (!session) return null;
    const { data, error } = await supabase
      .from("workout_logs")
      .insert({ student_id: session.user.id, workout_plan_id: String(id) })
      .select()
      .single();
    if (error || !data) return null;
    setLogId(data.id);
    return data.id;
  }

  async function toggleSetDone(item: WorkoutPlanExercise, setIndex: number) {
    const current = setState[item.id][setIndex];
    const nextCompleted = !current.completed;
    updateSet(item.id, setIndex, { completed: nextCompleted });

    if (nextCompleted) {
      const currentLogId = await ensureLog();
      if (!currentLogId) return;
      await supabase.from("workout_log_sets").insert({
        workout_log_id: currentLogId,
        workout_plan_exercise_id: item.id,
        set_number: setIndex + 1,
        reps_done: current.reps_done ? Number(current.reps_done) : null,
        load_kg_done: current.load_kg_done ? Number(current.load_kg_done) : null,
        completed: true,
      });
    }
  }

  async function finishWorkout() {
    setSaving(true);
    const currentLogId = logId ?? (await ensureLog());
    if (currentLogId) {
      await supabase
        .from("workout_logs")
        .update({ completed_at: new Date().toISOString() })
        .eq("id", currentLogId);
    }
    setSaving(false);
    setFinished(true);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.volt} />
      </View>
    );
  }

  if (finished) {
    return (
      <View style={styles.center}>
        <Text style={styles.doneEmoji}>💪</Text>
        <Text style={styles.doneTitle}>Treino concluído!</Text>
        <Text style={styles.doneSubtitle}>Bom trabalho no {planName}.</Text>
      </View>
    );
  }

  const totalSets = items.reduce((acc, item) => acc + item.sets, 0);
  const doneSets = Object.values(setState).reduce(
    (acc, sets) => acc + sets.filter((s) => s.completed).length,
    0
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100, gap: 16 }}>
        <Text style={styles.progressLabel}>
          {doneSets} de {totalSets} séries concluídas
        </Text>

        {items.map((item) => (
          <View key={item.id} style={styles.exerciseCard}>
            <View style={styles.exerciseHeader}>
              <Text style={styles.exerciseName}>{item.exercise?.name}</Text>
              {item.exercise?.muscle_group ? (
                <Text style={styles.muscleTag}>
                  {MUSCLE_GROUP_LABELS[item.exercise.muscle_group]}
                </Text>
              ) : null}
            </View>
            <Text style={styles.exerciseMeta}>
              {item.sets}x{item.reps}
              {item.load_kg ? ` · sugerido ${item.load_kg}kg` : ""} · descanso{" "}
              {item.rest_seconds}s
            </Text>

            <View style={{ gap: 8, marginTop: 12 }}>
              {setState[item.id]?.map((set, i) => (
                <View key={i} style={styles.setRow}>
                  <Text style={styles.setLabel}>Série {i + 1}</Text>
                  <TextInput
                    style={styles.setInput}
                    keyboardType="numeric"
                    placeholder="reps"
                    placeholderTextColor={colors.muted}
                    value={set.reps_done}
                    onChangeText={(v) => updateSet(item.id, i, { reps_done: v })}
                  />
                  <TextInput
                    style={styles.setInput}
                    keyboardType="numeric"
                    placeholder="kg"
                    placeholderTextColor={colors.muted}
                    value={set.load_kg_done}
                    onChangeText={(v) => updateSet(item.id, i, { load_kg_done: v })}
                  />
                  <Pressable
                    style={[styles.checkButton, set.completed && styles.checkButtonDone]}
                    onPress={() => toggleSetDone(item, i)}
                  >
                    <Text style={styles.checkMark}>{set.completed ? "✓" : ""}</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.finishButton} onPress={finishWorkout} disabled={saving}>
          {saving ? (
            <ActivityIndicator color={colors.voltDark} />
          ) : (
            <Text style={styles.finishButtonText}>Concluir treino</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg950 },
  center: { flex: 1, backgroundColor: colors.bg950, alignItems: "center", justifyContent: "center", padding: 24 },
  progressLabel: { color: colors.muted, fontSize: 13, fontWeight: "600" },
  exerciseCard: {
    backgroundColor: colors.bg800,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
  },
  exerciseHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  exerciseName: { color: colors.text, fontSize: 16, fontWeight: "600", flex: 1 },
  muscleTag: {
    color: colors.volt,
    fontSize: 11,
    fontWeight: "600",
    borderWidth: 1,
    borderColor: colors.volt,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  exerciseMeta: { color: colors.muted, fontSize: 12, marginTop: 4 },
  setRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  setLabel: { color: colors.muted, fontSize: 12, width: 56 },
  setInput: {
    flex: 1,
    backgroundColor: colors.bg900,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: colors.text,
    fontSize: 13,
  },
  checkButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkButtonDone: { backgroundColor: colors.volt, borderColor: colors.volt },
  checkMark: { color: colors.voltDark, fontWeight: "700" },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: colors.bg950,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  finishButton: {
    backgroundColor: colors.volt,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
  },
  finishButtonText: { color: colors.voltDark, fontWeight: "700", fontSize: 15 },
  doneEmoji: { fontSize: 48, marginBottom: 12 },
  doneTitle: { color: colors.text, fontSize: 20, fontWeight: "700" },
  doneSubtitle: { color: colors.muted, fontSize: 14, marginTop: 6 },
});
