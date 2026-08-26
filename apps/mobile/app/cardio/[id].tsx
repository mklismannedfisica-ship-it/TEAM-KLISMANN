import { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  CARDIO_ACTIVITY_LABELS,
  CARDIO_INTENSITY_LABELS,
  type CardioSession,
} from "@ptapp/shared";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { colors } from "@/lib/theme";

function formatSeconds(total: number) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function CardioExecutionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const router = useRouter();

  const [cardioSession, setCardioSession] = useState<CardioSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("cardio_sessions").select("*").eq("id", id).single();
      setCardioSession(data);
      setLoading(false);
    }
    load();
  }, [id]);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, [running]);

  async function finish() {
    if (!session || !cardioSession) return;
    setSaving(true);
    await supabase.from("cardio_logs").insert({
      student_id: session.user.id,
      cardio_session_id: cardioSession.id,
      duration_minutes_done: Math.round(elapsed / 60),
    });
    setSaving(false);
    setDone(true);
  }

  if (loading || !cardioSession) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.volt} />
      </View>
    );
  }

  if (done) {
    return (
      <View style={styles.center}>
        <Text style={styles.doneEmoji}>🔥</Text>
        <Text style={styles.doneTitle}>Cardio concluído!</Text>
        <Text style={styles.doneSubtitle}>
          {Math.round(elapsed / 60)}min de {cardioSession.name}
        </Text>
        <Pressable style={styles.doneButton} onPress={() => router.replace("/(tabs)/cardio")}>
          <Text style={styles.doneButtonText}>Voltar</Text>
        </Pressable>
      </View>
    );
  }

  const targetSeconds = cardioSession.duration_minutes * 60;
  const progress = Math.min(1, elapsed / targetSeconds);

  return (
    <View style={styles.container}>
      <Pressable style={styles.backPill} onPress={() => router.back()}>
        <Text style={styles.backPillText}>‹ Voltar</Text>
      </Pressable>

      <View style={styles.content}>
        <Text style={styles.sessionName}>{cardioSession.name}</Text>
        <Text style={styles.sessionMeta}>
          {CARDIO_ACTIVITY_LABELS[cardioSession.activity]} ·{" "}
          {CARDIO_INTENSITY_LABELS[cardioSession.intensity]} · meta {cardioSession.duration_minutes}
          min
        </Text>

        {cardioSession.instructions ? (
          <View style={styles.instructionsBox}>
            <Text style={styles.instructionsTitle}>Instruções do treinador</Text>
            <Text style={styles.instructionsText}>{cardioSession.instructions}</Text>
          </View>
        ) : null}

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>

        <Text style={styles.timerValue}>{formatSeconds(elapsed)}</Text>
        <Text style={styles.timerTarget}>meta {formatSeconds(targetSeconds)}</Text>

        <Pressable style={styles.playButton} onPress={() => setRunning((r) => !r)}>
          <Text style={styles.playIcon}>{running ? "⏸" : "▶"}</Text>
        </Pressable>
      </View>

      <Pressable style={styles.finishButton} onPress={finish} disabled={saving || elapsed === 0}>
        {saving ? (
          <ActivityIndicator color={colors.voltDark} />
        ) : (
          <Text style={styles.finishButtonText}>Concluir sessão</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg950, padding: 20 },
  center: { flex: 1, backgroundColor: colors.bg950, alignItems: "center", justifyContent: "center", padding: 24 },
  backPill: { alignSelf: "flex-start" },
  backPillText: { color: colors.volt, fontSize: 14, fontWeight: "700" },
  content: { flex: 1, alignItems: "center", justifyContent: "center" },
  sessionName: { color: colors.text, fontSize: 24, fontWeight: "800", textAlign: "center" },
  sessionMeta: { color: colors.muted, fontSize: 13, marginTop: 6, textAlign: "center" },
  instructionsBox: {
    marginTop: 20,
    borderLeftWidth: 3,
    borderLeftColor: colors.volt,
    paddingLeft: 12,
    alignSelf: "stretch",
  },
  instructionsTitle: { color: colors.text, fontSize: 13, fontWeight: "700" },
  instructionsText: { color: colors.muted, fontSize: 13, marginTop: 2 },
  progressTrack: {
    marginTop: 32,
    width: "100%",
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.bg800,
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: colors.volt, borderRadius: 4 },
  timerValue: { color: colors.text, fontSize: 56, fontWeight: "800", marginTop: 24 },
  timerTarget: { color: colors.muted, fontSize: 13, marginTop: 4 },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#22c55e",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },
  playIcon: { color: "#fff", fontSize: 24 },
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
  doneButton: {
    marginTop: 24,
    backgroundColor: colors.volt,
    borderRadius: 999,
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  doneButtonText: { color: colors.voltDark, fontWeight: "700", fontSize: 14 },
});
