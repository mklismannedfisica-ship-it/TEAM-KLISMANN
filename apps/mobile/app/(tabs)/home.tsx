import { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { planValidityLabel, type WorkoutPlan } from "@ptapp/shared";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { colors } from "@/lib/theme";

type PlanWithCount = WorkoutPlan & { exercise_count: number };

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function HomeScreen() {
  const { session, profile } = useAuth();
  const router = useRouter();
  const [plans, setPlans] = useState<PlanWithCount[]>([]);
  const [completedPlanIdsThisWeek, setCompletedPlanIdsThisWeek] = useState<Set<string>>(new Set());
  const [daysSinceLastWorkout, setDaysSinceLastWorkout] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadData() {
    if (!session) return;

    const { data: planData } = await supabase
      .from("workout_plans")
      .select("*, workout_plan_exercises(id)")
      .eq("student_id", session.user.id)
      .eq("active", true)
      .order("order_index");

    setPlans(
      (planData ?? []).map((p) => ({
        ...p,
        exercise_count: p.workout_plan_exercises?.length ?? 0,
      }))
    );

    const weekStart = startOfWeek(new Date()).toISOString();
    const { data: logs } = await supabase
      .from("workout_logs")
      .select("workout_plan_id, completed_at")
      .eq("student_id", session.user.id)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(100);

    const thisWeek = new Set(
      (logs ?? [])
        .filter((l) => l.completed_at && l.completed_at >= weekStart)
        .map((l) => l.workout_plan_id)
    );
    setCompletedPlanIdsThisWeek(thisWeek);

    if (logs && logs.length > 0 && logs[0].completed_at) {
      const last = new Date(logs[0].completed_at);
      const diffDays = Math.floor((Date.now() - last.getTime()) / (1000 * 60 * 60 * 24));
      setDaysSinceLastWorkout(diffDays);
    } else {
      setDaysSinceLastWorkout(null);
    }

    setLoading(false);
    setRefreshing(false);
  }

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [session])
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.volt} />
      </View>
    );
  }

  const weeklyGoal = plans.length;
  const weeklyDone = plans.filter((p) => completedPlanIdsThisWeek.has(p.id)).length;
  const nextPlan = plans.find((p) => !completedPlanIdsThisWeek.has(p.id)) ?? plans[0];
  const showReminder = daysSinceLastWorkout !== null && daysSinceLastWorkout >= 3;

  return (
    <View style={styles.container}>
      <FlatList
        data={plans}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 24, gap: 12 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadData();
            }}
            tintColor={colors.volt}
          />
        }
        ListHeaderComponent={
          <View style={{ marginBottom: 20 }}>
            <Text style={styles.greeting}>
              Olá, {profile?.full_name?.split(" ")[0] ?? "aluno"} 👋
            </Text>

            {showReminder ? (
              <View style={styles.reminderBanner}>
                <Text style={styles.reminderText}>
                  {daysSinceLastWorkout === 0
                    ? "Você ainda não treinou hoje. Bora treinar!"
                    : `Já fazem ${daysSinceLastWorkout} dias sem treino. Bora voltar!`}
                </Text>
              </View>
            ) : null}

            {weeklyGoal > 0 ? (
              <View style={styles.progressCard}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressLabel}>Treinos da semana</Text>
                  <Text style={styles.progressValue}>
                    {weeklyDone}/{weeklyGoal}
                  </Text>
                </View>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${weeklyGoal ? (weeklyDone / weeklyGoal) * 100 : 0}%` },
                    ]}
                  />
                </View>
              </View>
            ) : null}

            {nextPlan ? (
              <Pressable
                style={styles.nextCard}
                onPress={() => router.push(`/workout/${nextPlan.id}`)}
              >
                <Text style={styles.nextLabel}>Próximo treino</Text>
                <Text style={styles.nextTitle}>{nextPlan.name}</Text>
                <View style={styles.nextButton}>
                  <Text style={styles.nextButtonText}>Ir para o treino</Text>
                </View>
              </Pressable>
            ) : null}

            <Text style={styles.subtitle}>Suas fichas</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              Você ainda não tem treinos cadastrados. Fale com seu personal.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const validity = planValidityLabel(item.valid_until);
          return (
            <Pressable
              style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
              onPress={() => router.push(`/workout/${item.id}`)}
            >
              <View>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardSubtitle}>{item.exercise_count} exercícios</Text>
                {validity ? (
                  <Text
                    style={[
                      styles.validityTag,
                      validity.status === "expired" && styles.validityExpired,
                      validity.status === "soon" && styles.validitySoon,
                    ]}
                  >
                    {validity.label}
                  </Text>
                ) : null}
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg950, padding: 20 },
  center: { flex: 1, backgroundColor: colors.bg950, alignItems: "center", justifyContent: "center" },
  greeting: { fontSize: 22, fontWeight: "700", color: colors.text },
  subtitle: { fontSize: 13, fontWeight: "600", color: colors.muted, marginTop: 24, textTransform: "uppercase" },
  reminderBanner: {
    marginTop: 16,
    backgroundColor: colors.volt,
    borderRadius: 14,
    padding: 14,
  },
  reminderText: { color: colors.voltDark, fontSize: 13, fontWeight: "600" },
  progressCard: {
    marginTop: 16,
    backgroundColor: colors.bg800,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
  },
  progressHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  progressLabel: { color: colors.text, fontSize: 13, fontWeight: "600" },
  progressValue: { color: colors.volt, fontSize: 13, fontWeight: "700" },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.bg700,
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: colors.volt, borderRadius: 4 },
  nextCard: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.volt,
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
  },
  nextLabel: { color: colors.muted, fontSize: 12 },
  nextTitle: { color: colors.text, fontSize: 20, fontWeight: "700", marginTop: 4 },
  nextButton: {
    marginTop: 12,
    backgroundColor: colors.volt,
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  nextButtonText: { color: colors.voltDark, fontWeight: "700", fontSize: 13 },
  card: {
    backgroundColor: colors.bg800,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitle: { fontSize: 16, fontWeight: "600", color: colors.text },
  cardSubtitle: { fontSize: 13, color: colors.muted, marginTop: 4 },
  validityTag: { fontSize: 11, fontWeight: "600", color: colors.muted, marginTop: 6 },
  validitySoon: { color: "#fbbf24" },
  validityExpired: { color: "#f87171" },
  chevron: { fontSize: 22, color: colors.muted },
  empty: { padding: 24, alignItems: "center" },
  emptyText: { color: colors.muted, textAlign: "center", fontSize: 14 },
});
