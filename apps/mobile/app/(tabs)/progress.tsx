import { useCallback, useState } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from "react-native";
import { useFocusEffect } from "expo-router";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { colors } from "@/lib/theme";

type LogRow = {
  id: string;
  started_at: string;
  completed_at: string | null;
  workout_plans: { name: string } | null;
};

function formatDate(iso: string) {
  const date = new Date(iso);
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function ProgressScreen() {
  const { session } = useAuth();
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      async function load() {
        if (!session) return;
        const { data } = await supabase
          .from("workout_logs")
          .select("id, started_at, completed_at, workout_plans(name)")
          .eq("student_id", session.user.id)
          .not("completed_at", "is", null)
          .order("completed_at", { ascending: false })
          .limit(50);
        setLogs((data as unknown as LogRow[]) ?? []);
        setLoading(false);
      }
      load();
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
      <Text style={styles.title}>Progresso</Text>
      <View style={styles.statCard}>
        <Text style={styles.statValue}>{logs.length}</Text>
        <Text style={styles.statLabel}>treinos concluídos</Text>
      </View>

      <FlatList
        data={logs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 24, gap: 10 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              Nenhum treino concluído ainda. Vá para a aba Treinos e comece o de hoje.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.logRow}>
            <View>
              <Text style={styles.logName}>{item.workout_plans?.name ?? "Treino"}</Text>
              <Text style={styles.logDate}>
                {item.completed_at ? formatDate(item.completed_at) : ""}
              </Text>
            </View>
            <Text style={styles.checkIcon}>✓</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg950, padding: 20 },
  center: { flex: 1, backgroundColor: colors.bg950, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "700", color: colors.text },
  statCard: {
    marginTop: 16,
    backgroundColor: colors.bg800,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
  },
  statValue: { fontSize: 32, fontWeight: "800", color: colors.volt },
  statLabel: { fontSize: 13, color: colors.muted, marginTop: 4 },
  logRow: {
    backgroundColor: colors.bg800,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logName: { color: colors.text, fontSize: 14, fontWeight: "600" },
  logDate: { color: colors.muted, fontSize: 12, marginTop: 2 },
  checkIcon: { color: colors.volt, fontSize: 16, fontWeight: "700" },
  empty: { padding: 24, alignItems: "center" },
  emptyText: { color: colors.muted, textAlign: "center", fontSize: 14 },
});
