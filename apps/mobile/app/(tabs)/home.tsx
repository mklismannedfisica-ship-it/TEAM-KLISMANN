import { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import type { WorkoutPlan } from "@ptapp/shared";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { colors } from "@/lib/theme";

type PlanWithCount = WorkoutPlan & { exercise_count: number };

export default function HomeScreen() {
  const { session, profile } = useAuth();
  const router = useRouter();
  const [plans, setPlans] = useState<PlanWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadPlans() {
    if (!session) return;
    const { data } = await supabase
      .from("workout_plans")
      .select("*, workout_plan_exercises(id)")
      .eq("student_id", session.user.id)
      .eq("active", true)
      .order("order_index");

    setPlans(
      (data ?? []).map((p) => ({
        ...p,
        exercise_count: p.workout_plan_exercises?.length ?? 0,
      }))
    );
    setLoading(false);
    setRefreshing(false);
  }

  useFocusEffect(
    useCallback(() => {
      loadPlans();
    }, [session])
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.volt} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>Olá, {profile?.full_name?.split(" ")[0] ?? "aluno"} 👋</Text>
      <Text style={styles.subtitle}>Seus treinos de hoje</Text>

      <FlatList
        data={plans}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 24, gap: 12 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadPlans();
            }}
            tintColor={colors.volt}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              Você ainda não tem treinos cadastrados. Fale com seu personal.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
            onPress={() => router.push(`/workout/${item.id}`)}
          >
            <View>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardSubtitle}>{item.exercise_count} exercícios</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg950, padding: 20 },
  center: { flex: 1, backgroundColor: colors.bg950, alignItems: "center", justifyContent: "center" },
  greeting: { fontSize: 22, fontWeight: "700", color: colors.text },
  subtitle: { fontSize: 14, color: colors.muted, marginTop: 4, marginBottom: 20 },
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
  chevron: { fontSize: 22, color: colors.muted },
  empty: { padding: 24, alignItems: "center" },
  emptyText: { color: colors.muted, textAlign: "center", fontSize: 14 },
});
