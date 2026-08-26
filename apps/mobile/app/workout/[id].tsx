import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Modal,
  Linking,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { EFFORT_LABELS, type SetType, type WorkoutPlanExercise } from "@ptapp/shared";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { colors } from "@/lib/theme";

const SET_TYPE_COLOR: Record<SetType, string> = {
  warmup: "#ef4444",
  prep: "#f59e0b",
  valid: "#22c55e",
};

const SET_TYPE_LABEL: Record<SetType, string> = {
  warmup: "Aquecimento",
  prep: "Preparatória",
  valid: "Válidas",
};

type UnifiedSet = {
  type: SetType;
  indexInType: number;
  reps_done: string;
  load_kg_done: string;
  completed: boolean;
};

function buildUnifiedSets(item: WorkoutPlanExercise): UnifiedSet[] {
  const list: UnifiedSet[] = [];
  for (let i = 0; i < item.warmup_sets; i++) {
    list.push({ type: "warmup", indexInType: i + 1, reps_done: "", load_kg_done: "", completed: false });
  }
  for (let i = 0; i < item.prep_sets; i++) {
    list.push({ type: "prep", indexInType: i + 1, reps_done: "", load_kg_done: "", completed: false });
  }
  for (let i = 0; i < item.sets; i++) {
    list.push({
      type: "valid",
      indexInType: i + 1,
      reps_done: "",
      load_kg_done: item.load_kg ? String(item.load_kg) : "",
      completed: false,
    });
  }
  return list;
}

function formatSeconds(total: number) {
  const m = Math.floor(total / 60);
  const s = Math.max(0, total % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const router = useRouter();

  const [planName, setPlanName] = useState("");
  const [items, setItems] = useState<WorkoutPlanExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [logId, setLogId] = useState<string | null>(null);

  const [mode, setMode] = useState<"overview" | "exercise" | "done">("overview");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [setsByExercise, setSetsByExercise] = useState<Record<string, UnifiedSet[]>>({});
  const [selectedSetIndex, setSelectedSetIndex] = useState<Record<string, number>>({});

  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const [timerTab, setTimerTab] = useState<"timer" | "stopwatch">("timer");
  const [restRemaining, setRestRemaining] = useState(60);
  const [stopwatch, setStopwatch] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);

  const [showFinishModal, setShowFinishModal] = useState(false);
  const [effortRating, setEffortRating] = useState<number | null>(null);
  const [finishNotes, setFinishNotes] = useState("");
  const [finishing, setFinishing] = useState(false);
  const [finalStats, setFinalStats] = useState({ duration: 0, volume: 0, reps: 0 });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: plan } = await supabase
        .from("workout_plans")
        .select("name")
        .eq("id", id)
        .single();
      if (plan) setPlanName(plan.name);

      const { data: planExercises } = await supabase
        .from("workout_plan_exercises")
        .select("*, exercise:exercises(*)")
        .eq("workout_plan_id", id)
        .order("order_index");

      const list = planExercises ?? [];
      setItems(list);

      const initial: Record<string, UnifiedSet[]> = {};
      for (const item of list) initial[item.id] = buildUnifiedSets(item);
      setSetsByExercise(initial);
      setLoading(false);
    }
    load();
  }, [id]);

  useEffect(() => {
    if (mode !== "exercise" || !startedAt) return;
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [mode, startedAt]);

  useEffect(() => {
    if (!timerRunning) return;
    const interval = setInterval(() => {
      if (timerTab === "timer") {
        setRestRemaining((r) => (r > 0 ? r - 1 : 0));
      } else {
        setStopwatch((s) => s + 1);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning, timerTab]);

  function updateSet(exerciseId: string, setIndex: number, patch: Partial<UnifiedSet>) {
    setSetsByExercise((prev) => ({
      ...prev,
      [exerciseId]: prev[exerciseId].map((s, i) => (i === setIndex ? { ...s, ...patch } : s)),
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

  function startWorkout() {
    setStartedAt(new Date());
    setMode("exercise");
    setCurrentIndex(0);
  }

  async function completeSet(item: WorkoutPlanExercise, setIndex: number) {
    const current = setsByExercise[item.id][setIndex];
    updateSet(item.id, setIndex, { completed: true });

    const currentLogId = await ensureLog();
    if (!currentLogId) return;

    await supabase.from("workout_log_sets").insert({
      workout_log_id: currentLogId,
      workout_plan_exercise_id: item.id,
      set_type: current.type,
      set_number: current.indexInType,
      reps_done: current.reps_done ? Number(current.reps_done) : null,
      load_kg_done: current.load_kg_done ? Number(current.load_kg_done) : null,
      completed: true,
    });

    const sets = setsByExercise[item.id];
    const nextIncomplete = sets.findIndex((s, i) => i > setIndex && !s.completed);
    if (nextIncomplete !== -1) {
      setSelectedSetIndex((prev) => ({ ...prev, [item.id]: nextIncomplete }));
    }
    if (item.rest_seconds) {
      setRestRemaining(item.rest_seconds);
      setTimerTab("timer");
      setTimerRunning(false);
    }
  }

  function cancelWorkout() {
    Alert.alert("Cancelar treino", "O progresso feito até agora não será salvo como concluído.", [
      { text: "Voltar", style: "cancel" },
      { text: "Cancelar treino", style: "destructive", onPress: () => router.back() },
    ]);
  }

  function openFinishModal() {
    setShowFinishModal(true);
  }

  async function confirmFinish() {
    setFinishing(true);
    const currentLogId = logId ?? (await ensureLog());

    let volume = 0;
    let reps = 0;
    for (const item of items) {
      for (const set of setsByExercise[item.id] ?? []) {
        if (set.type === "valid" && set.completed) {
          const r = Number(set.reps_done) || 0;
          const l = Number(set.load_kg_done) || 0;
          volume += r * l;
          reps += r;
        }
      }
    }
    const duration = startedAt ? Math.round((Date.now() - startedAt.getTime()) / 60000) : 0;

    if (currentLogId) {
      await supabase
        .from("workout_logs")
        .update({
          completed_at: new Date().toISOString(),
          duration_minutes: duration,
          effort_rating: effortRating,
          notes: finishNotes || null,
        })
        .eq("id", currentLogId);
    }

    setFinalStats({ duration, volume, reps });
    setFinishing(false);
    setShowFinishModal(false);
    setMode("done");
  }

  async function pickPhoto(source: "camera" | "gallery") {
    if (!logId || !session) return;

    const permission =
      source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permissão necessária", "Autorize o acesso para continuar.");
      return;
    }

    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: true })
        : await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsEditing: true });

    if (result.canceled || !result.assets?.[0]) return;

    setUploadingPhoto(true);
    try {
      const uri = result.assets[0].uri;
      const response = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();
      const path = `${session.user.id}/${logId}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("workout-photos")
        .upload(path, arrayBuffer, { contentType: "image/jpeg", upsert: true });

      if (!uploadError) {
        const { data } = supabase.storage.from("workout-photos").getPublicUrl(path);
        await supabase.from("workout_logs").update({ photo_url: data.publicUrl }).eq("id", logId);
      }
    } finally {
      setUploadingPhoto(false);
      router.replace("/(tabs)/home");
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.volt} />
      </View>
    );
  }

  if (mode === "done") {
    return (
      <View style={styles.doneContainer}>
        <Pressable style={styles.closeButton} onPress={() => router.replace("/(tabs)/home")}>
          <Text style={styles.closeButtonText}>✕</Text>
        </Pressable>

        <View style={styles.doneContent}>
          <View style={styles.doneCheck}>
            <Text style={styles.doneCheckMark}>✓</Text>
          </View>
          <Text style={styles.doneTitle}>Parabéns!</Text>
          <Text style={styles.doneSubtitle}>Treino concluído</Text>

          <View style={styles.doneStatsRow}>
            <View style={styles.doneStat}>
              <Text style={styles.doneStatValue}>{finalStats.duration}min</Text>
              <Text style={styles.doneStatLabel}>DURAÇÃO</Text>
            </View>
            <View style={styles.doneStat}>
              <Text style={styles.doneStatValue}>{finalStats.volume}kg</Text>
              <Text style={styles.doneStatLabel}>VOLUME</Text>
            </View>
            <View style={styles.doneStat}>
              <Text style={styles.doneStatValue}>{finalStats.reps}x</Text>
              <Text style={styles.doneStatLabel}>REPS</Text>
            </View>
          </View>

          <Text style={styles.donePrompt}>Que tal guardar uma foto do seu progresso?</Text>
        </View>

        <View style={{ gap: 12 }}>
          <Pressable
            style={styles.photoButton}
            onPress={() => pickPhoto("camera")}
            disabled={uploadingPhoto}
          >
            {uploadingPhoto ? (
              <ActivityIndicator color={colors.voltDark} />
            ) : (
              <Text style={styles.photoButtonText}>📷 Tirar uma foto</Text>
            )}
          </Pressable>
          <Pressable onPress={() => pickPhoto("gallery")} disabled={uploadingPhoto}>
            <Text style={styles.photoLink}>Escolher da galeria</Text>
          </Pressable>
          <Pressable onPress={() => router.replace("/(tabs)/home")} disabled={uploadingPhoto}>
            <Text style={styles.skipLink}>Pular</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (mode === "overview") {
    return (
      <View style={styles.container}>
        <View style={styles.overviewHeader}>
          <Pressable style={styles.backPill} onPress={() => router.back()}>
            <Text style={styles.backPillText}>‹ Voltar</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
          <Text style={styles.overviewTitle}>{planName}</Text>

          {items.map((item) => (
            <View key={item.id} style={styles.overviewRow}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={styles.overviewExerciseName}>{item.exercise?.name}</Text>
                  {item.exercise?.video_url ? (
                    <Pressable onPress={() => Linking.openURL(item.exercise!.video_url!)}>
                      <Text style={styles.playIcon}>▶</Text>
                    </Pressable>
                  ) : null}
                </View>
                <View style={styles.overviewDots}>
                  <Text style={styles.overviewDotsText}>Séries: </Text>
                  {item.warmup_sets > 0 ? (
                    <Text style={styles.overviewDotsText}>
                      <Text style={{ color: SET_TYPE_COLOR.warmup }}>●</Text> {item.warmup_sets}{" "}
                    </Text>
                  ) : null}
                  {item.prep_sets > 0 ? (
                    <Text style={styles.overviewDotsText}>
                      <Text style={{ color: SET_TYPE_COLOR.prep }}>●</Text> {item.prep_sets}{" "}
                    </Text>
                  ) : null}
                  <Text style={styles.overviewDotsText}>
                    <Text style={{ color: SET_TYPE_COLOR.valid }}>●</Text> {item.sets}
                  </Text>
                </View>
                <Text style={styles.overviewReps}>Reps {item.reps}</Text>
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable style={styles.finishButton} onPress={startWorkout}>
            <Text style={styles.finishButtonText}>▶  Iniciar treino</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const item = items[currentIndex];
  const sets = setsByExercise[item.id] ?? [];
  const selectedIndex = selectedSetIndex[item.id] ?? sets.findIndex((s) => !s.completed);
  const activeIndex = selectedIndex === -1 ? 0 : selectedIndex;
  const activeSet = sets[activeIndex];
  const doneCount = sets.filter((s) => s.completed).length;

  return (
    <View style={styles.container}>
      <View style={styles.exerciseHeaderBar}>
        <Pressable onPress={() => setMode("overview")}>
          <Text style={styles.backPillText}>‹ Voltar</Text>
        </Pressable>
        <View style={{ alignItems: "center" }}>
          <Text style={styles.totalTimeLabel}>Tempo total</Text>
          <Text style={styles.totalTimeValue}>{formatSeconds(elapsedSeconds)}</Text>
        </View>
        <Pressable onPress={cancelWorkout}>
          <Text style={styles.cancelText}>Cancelar treino</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Pressable
            disabled={currentIndex === 0}
            onPress={() => setCurrentIndex((i) => Math.max(0, i - 1))}
          >
            <Text style={[styles.navArrow, currentIndex === 0 && styles.navArrowDisabled]}>‹</Text>
          </Pressable>
          <Text style={styles.exerciseTitle}>{item.exercise?.name}</Text>
          <Pressable
            disabled={currentIndex === items.length - 1}
            onPress={() => setCurrentIndex((i) => Math.min(items.length - 1, i + 1))}
          >
            <Text
              style={[
                styles.navArrow,
                currentIndex === items.length - 1 && styles.navArrowDisabled,
              ]}
            >
              ›
            </Text>
          </Pressable>
        </View>

        {item.exercise?.video_url ? (
          <Pressable
            style={styles.videoButton}
            onPress={() => Linking.openURL(item.exercise!.video_url!)}
          >
            <Text style={styles.videoButtonText}>▶ Ver vídeo do exercício</Text>
          </Pressable>
        ) : null}

        <View style={styles.setTypesSummary}>
          {item.warmup_sets > 0 ? (
            <Text style={styles.setTypeSummaryLine}>
              <Text style={{ color: SET_TYPE_COLOR.warmup }}>● </Text>
              Aquecimento {item.warmup_sets}
              {item.warmup_reps ? ` · ${item.warmup_reps} reps` : ""}
            </Text>
          ) : null}
          {item.prep_sets > 0 ? (
            <Text style={styles.setTypeSummaryLine}>
              <Text style={{ color: SET_TYPE_COLOR.prep }}>● </Text>
              Preparatória {item.prep_sets}
              {item.prep_reps ? ` · ${item.prep_reps} reps` : ""}
            </Text>
          ) : null}
          <Text style={styles.setTypeSummaryLine}>
            <Text style={{ color: SET_TYPE_COLOR.valid }}>● </Text>
            Válidas {item.sets} · Reps {item.reps} · Intervalo {item.rest_seconds}s
          </Text>
        </View>

        <View style={styles.completedRow}>
          <View style={[styles.checkbox, doneCount === sets.length && styles.checkboxDone]}>
            {doneCount === sets.length && sets.length > 0 ? (
              <Text style={styles.checkboxMark}>✓</Text>
            ) : null}
          </View>
          <Text style={styles.completedText}>
            Exercício concluído · {doneCount}/{sets.length}
          </Text>
        </View>

        <View style={styles.setPillRow}>
          {sets.map((s, i) => (
            <Pressable
              key={i}
              style={[
                styles.setPill,
                { borderColor: SET_TYPE_COLOR[s.type] },
                i === activeIndex && { backgroundColor: SET_TYPE_COLOR[s.type] + "22" },
              ]}
              onPress={() => setSelectedSetIndex((prev) => ({ ...prev, [item.id]: i }))}
            >
              <View style={[styles.setPillDot, { backgroundColor: SET_TYPE_COLOR[s.type] }]} />
              <Text style={styles.setPillText}>{s.indexInType}ª</Text>
              {s.completed ? <Text style={styles.setPillCheck}>✓</Text> : null}
            </Pressable>
          ))}
        </View>

        {activeSet ? (
          <View style={styles.activeSetCard}>
            <Text style={styles.activeSetLabel}>
              {SET_TYPE_LABEL[activeSet.type]} · série {activeSet.indexInType}
            </Text>
            <View style={{ flexDirection: "row", gap: 12, marginTop: 10 }}>
              <View style={{ flex: 1 }}>
                <TextInput
                  style={styles.bigInput}
                  keyboardType="numeric"
                  placeholder="-"
                  placeholderTextColor={colors.muted}
                  value={activeSet.load_kg_done}
                  onChangeText={(v) => updateSet(item.id, activeIndex, { load_kg_done: v })}
                />
                <Text style={styles.bigInputLabel}>Peso (kg)</Text>
              </View>
              <View style={{ flex: 1 }}>
                <TextInput
                  style={styles.bigInput}
                  keyboardType="numeric"
                  placeholder="-"
                  placeholderTextColor={colors.muted}
                  value={activeSet.reps_done}
                  onChangeText={(v) => updateSet(item.id, activeIndex, { reps_done: v })}
                />
                <Text style={styles.bigInputLabel}>Reps feitas</Text>
              </View>
            </View>
            <Pressable
              style={[styles.completeSetButton, activeSet.completed && { opacity: 0.6 }]}
              onPress={() => completeSet(item, activeIndex)}
              disabled={activeSet.completed}
            >
              <Text style={styles.completeSetButtonText}>
                {activeSet.completed ? "✓ Série concluída" : "✓ Concluir série"}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {item.notes ? (
          <View style={styles.trainerNotes}>
            <Text style={styles.trainerNotesTitle}>Observações do treinador</Text>
            <Text style={styles.trainerNotesText}>{item.notes}</Text>
          </View>
        ) : null}

        <View style={styles.timerSection}>
          <View style={styles.timerTabs}>
            <Pressable
              style={[styles.timerTab, timerTab === "timer" && styles.timerTabActive]}
              onPress={() => {
                setTimerTab("timer");
                setTimerRunning(false);
              }}
            >
              <Text style={[styles.timerTabText, timerTab === "timer" && styles.timerTabTextActive]}>
                Timer
              </Text>
            </Pressable>
            <Pressable
              style={[styles.timerTab, timerTab === "stopwatch" && styles.timerTabActive]}
              onPress={() => {
                setTimerTab("stopwatch");
                setTimerRunning(false);
              }}
            >
              <Text
                style={[styles.timerTabText, timerTab === "stopwatch" && styles.timerTabTextActive]}
              >
                Cronômetro
              </Text>
            </Pressable>
          </View>

          <Text style={styles.timerValue}>
            {timerTab === "timer" ? formatSeconds(restRemaining) : formatSeconds(stopwatch)}
          </Text>

          <View style={{ flexDirection: "row", gap: 16, alignItems: "center" }}>
            <Pressable
              style={styles.timerPlayButton}
              onPress={() => setTimerRunning((r) => !r)}
            >
              <Text style={styles.timerPlayIcon}>{timerRunning ? "⏸" : "▶"}</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setTimerRunning(false);
                if (timerTab === "timer") setRestRemaining(item.rest_seconds ?? 60);
                else setStopwatch(0);
              }}
            >
              <Text style={styles.timerResetIcon}>↻</Text>
            </Pressable>
          </View>
        </View>

        <Pressable style={styles.finishSecondaryButton} onPress={openFinishModal}>
          <Text style={styles.finishSecondaryButtonText}>Finalizar treino</Text>
        </Pressable>
      </ScrollView>

      <Modal visible={showFinishModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Finalizar treino</Text>
            <Text style={styles.modalSubtitle}>Tem certeza que deseja finalizar o treino atual?</Text>

            <Text style={styles.modalLabel}>Como foi o esforço nesse treino? (opcional)</Text>
            <View style={styles.effortRow}>
              {EFFORT_LABELS.map((e) => (
                <Pressable
                  key={e.value}
                  style={[styles.effortOption, effortRating === e.value && styles.effortOptionActive]}
                  onPress={() => setEffortRating(effortRating === e.value ? null : e.value)}
                >
                  <Text style={styles.effortEmoji}>{e.emoji}</Text>
                  <Text style={styles.effortLabel}>{e.label}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.modalLabel}>Observação sobre o treino (opcional)</Text>
            <TextInput
              style={styles.modalTextarea}
              multiline
              numberOfLines={3}
              placeholder="Ex: Treino intenso, senti dor no ombro..."
              placeholderTextColor={colors.muted}
              value={finishNotes}
              onChangeText={setFinishNotes}
            />

            <View style={{ flexDirection: "row", gap: 12, marginTop: 20 }}>
              <Pressable
                style={styles.modalCancelButton}
                onPress={() => setShowFinishModal(false)}
                disabled={finishing}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={styles.modalFinishButton}
                onPress={confirmFinish}
                disabled={finishing}
              >
                {finishing ? (
                  <ActivityIndicator color={colors.voltDark} />
                ) : (
                  <Text style={styles.modalFinishText}>Finalizar</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg950 },
  center: { flex: 1, backgroundColor: colors.bg950, alignItems: "center", justifyContent: "center", padding: 24 },

  overviewHeader: { paddingHorizontal: 20, paddingTop: 16 },
  backPill: { alignSelf: "flex-start" },
  backPillText: { color: colors.volt, fontSize: 14, fontWeight: "700" },
  overviewTitle: { color: colors.text, fontSize: 26, fontWeight: "800", textAlign: "center", marginBottom: 20 },
  overviewRow: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 14,
    flexDirection: "row",
  },
  overviewExerciseName: { color: colors.text, fontSize: 15, fontWeight: "700" },
  playIcon: { color: colors.volt, fontSize: 13 },
  overviewDots: { flexDirection: "row", flexWrap: "wrap", marginTop: 6 },
  overviewDotsText: { color: colors.muted, fontSize: 13 },
  overviewReps: { color: colors.muted, fontSize: 12, marginTop: 2 },

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
  finishButton: { backgroundColor: colors.volt, borderRadius: 999, paddingVertical: 14, alignItems: "center" },
  finishButtonText: { color: colors.voltDark, fontWeight: "700", fontSize: 15 },

  exerciseHeaderBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  totalTimeLabel: { color: colors.muted, fontSize: 11 },
  totalTimeValue: { color: colors.text, fontSize: 15, fontWeight: "700" },
  cancelText: { color: "#f87171", fontSize: 13, fontWeight: "600" },

  navArrow: { color: colors.text, fontSize: 32, fontWeight: "300", paddingHorizontal: 12 },
  navArrowDisabled: { opacity: 0.2 },
  exerciseTitle: { flex: 1, color: colors.text, fontSize: 20, fontWeight: "800", textAlign: "center" },

  videoButton: {
    alignSelf: "center",
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  videoButtonText: { color: colors.volt, fontSize: 13, fontWeight: "600" },

  setTypesSummary: { marginTop: 20, alignItems: "center", gap: 4 },
  setTypeSummaryLine: { color: colors.text, fontSize: 13, fontWeight: "600" },

  completedRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 16 },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxDone: { backgroundColor: colors.volt, borderColor: colors.volt },
  checkboxMark: { color: colors.voltDark, fontSize: 12, fontWeight: "700" },
  completedText: { color: colors.text, fontSize: 13, fontWeight: "600" },

  setPillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16, justifyContent: "center" },
  setPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  setPillDot: { width: 6, height: 6, borderRadius: 3 },
  setPillText: { color: colors.text, fontSize: 12, fontWeight: "700" },
  setPillCheck: { color: colors.volt, fontSize: 11, fontWeight: "700" },

  activeSetCard: {
    marginTop: 16,
    backgroundColor: colors.bg800,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
  },
  activeSetLabel: { color: colors.muted, fontSize: 12, fontWeight: "600", textAlign: "center" },
  bigInput: {
    backgroundColor: colors.bg900,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 14,
    textAlign: "center",
    color: colors.text,
    fontSize: 22,
    fontWeight: "700",
  },
  bigInputLabel: { color: colors.muted, fontSize: 11, textAlign: "center", marginTop: 4 },
  completeSetButton: {
    marginTop: 14,
    backgroundColor: colors.volt,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
  },
  completeSetButtonText: { color: colors.voltDark, fontWeight: "700", fontSize: 14 },

  trainerNotes: {
    marginTop: 16,
    borderLeftWidth: 3,
    borderLeftColor: colors.volt,
    paddingLeft: 12,
  },
  trainerNotesTitle: { color: colors.text, fontSize: 13, fontWeight: "700" },
  trainerNotesText: { color: colors.muted, fontSize: 13, marginTop: 2 },

  timerSection: { marginTop: 28, alignItems: "center" },
  timerTabs: { flexDirection: "row", backgroundColor: colors.bg800, borderRadius: 999, padding: 3 },
  timerTab: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 999 },
  timerTabActive: { backgroundColor: colors.volt },
  timerTabText: { color: colors.muted, fontSize: 12, fontWeight: "600" },
  timerTabTextActive: { color: colors.voltDark },
  timerValue: { color: colors.text, fontSize: 44, fontWeight: "800", marginTop: 14 },
  timerPlayButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#22c55e",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  timerPlayIcon: { color: "#fff", fontSize: 20 },
  timerResetIcon: { color: colors.muted, fontSize: 22, marginTop: 10 },

  finishSecondaryButton: {
    marginTop: 32,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
  },
  finishSecondaryButtonText: { color: colors.muted, fontWeight: "600", fontSize: 13 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", padding: 20 },
  modalCard: { backgroundColor: colors.bg900, borderRadius: 20, padding: 22 },
  modalTitle: { color: colors.text, fontSize: 22, fontWeight: "800" },
  modalSubtitle: { color: colors.muted, fontSize: 13, marginTop: 8 },
  modalLabel: { color: colors.text, fontSize: 13, fontWeight: "600", marginTop: 18, marginBottom: 10 },
  effortRow: { flexDirection: "row", justifyContent: "space-between" },
  effortOption: {
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 6,
    flex: 1,
    marginHorizontal: 2,
  },
  effortOptionActive: { borderColor: colors.volt, backgroundColor: colors.volt + "1a" },
  effortEmoji: { fontSize: 20 },
  effortLabel: { color: colors.muted, fontSize: 10, fontWeight: "600" },
  modalTextarea: {
    backgroundColor: colors.bg800,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    color: colors.text,
    fontSize: 13,
    minHeight: 80,
    textAlignVertical: "top",
  },
  modalCancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalCancelText: { color: colors.text, fontWeight: "700", fontSize: 14 },
  modalFinishButton: {
    flex: 1,
    backgroundColor: colors.volt,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalFinishText: { color: colors.voltDark, fontWeight: "700", fontSize: 14 },

  doneContainer: { flex: 1, backgroundColor: colors.bg950, padding: 24, justifyContent: "space-between" },
  closeButton: { alignSelf: "flex-end", padding: 8 },
  closeButtonText: { color: colors.text, fontSize: 18 },
  doneContent: { alignItems: "center", flex: 1, justifyContent: "center" },
  doneCheck: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.volt,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  doneCheckMark: { color: colors.voltDark, fontSize: 28, fontWeight: "800" },
  doneTitle: { color: colors.text, fontSize: 26, fontWeight: "800" },
  doneSubtitle: { color: colors.muted, fontSize: 14, marginTop: 4 },
  doneStatsRow: { flexDirection: "row", gap: 28, marginTop: 28 },
  doneStat: { alignItems: "center" },
  doneStatValue: { color: colors.text, fontSize: 18, fontWeight: "800" },
  doneStatLabel: { color: colors.muted, fontSize: 10, fontWeight: "600", marginTop: 4 },
  donePrompt: { color: colors.muted, fontSize: 13, marginTop: 32, textAlign: "center" },
  photoButton: {
    backgroundColor: colors.volt,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
  },
  photoButtonText: { color: colors.voltDark, fontWeight: "700", fontSize: 15 },
  photoLink: { color: colors.text, textAlign: "center", fontWeight: "600", fontSize: 14 },
  skipLink: { color: colors.muted, textAlign: "center", fontSize: 13 },
});
