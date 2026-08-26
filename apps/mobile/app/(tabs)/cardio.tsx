import { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import {
  CARDIO_ACTIVITY_LABELS,
  CARDIO_INTENSITY_LABELS,
  planValidityLabel,
  type CardioSession,
} from "@ptapp/shared";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { colors } from "@/lib/theme";

export default function CardioScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState<CardioSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    if (!session) return;
    const { data } = await supabase
      .from("cardio_sessions")
      .select("*")
      .eq("student_id", session.user.id)
      .eq("active", true)
      .order("order_index");
    setSessions(data ?? []);
    setLoading(false);
    setRefreshing(false);
  }

  useFocusEffect(
    useCallback(() => {
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
      <Text style={styles.title}>Cardio</Text>
      <Text style={styles.subtitle}>Sessões prescritas pelo seu personal</Text>

      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 24, gap: 12 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={colors.volt}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              Nenhuma sessão de cardio cadastrada ainda. Fale com seu personal.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const validity = planValidityLabel(item.valid_until);
          return (
            <Pressable
              style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
              onPress={() => router.push(`/cardio/${item.id}`)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardSubtitle}>
                  {CARDIO_ACTIVITY_LABELS[item.activity]} ·{" "}
                  {CARDIO_INTENSITY_LABELS[item.intensity]} · {item.duration_minutes}min
                </Text>
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
  title: { fontSize: 22, fontWeight: "700", color: colors.text },
  subtitle: { fontSize: 14, color: colors.muted, marginTop: 4 },
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
