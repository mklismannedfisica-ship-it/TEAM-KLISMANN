"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { EFFORT_LABELS, type SetType, type WorkoutPlanExercise } from "@ptapp/shared";
import { createClient } from "@/lib/supabase/client";

const SET_TYPE_COLOR: Record<SetType, string> = {
  warmup: "#ef4444",
  prep: "#f59e0b",
  valid: "#c6ff3d",
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

export default function WorkoutExecutionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [planName, setPlanName] = useState("");
  const [items, setItems] = useState<WorkoutPlanExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [logId, setLogId] = useState<string | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);

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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setStudentId(user?.id ?? null);

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
      if (timerTab === "timer") setRestRemaining((r) => (r > 0 ? r - 1 : 0));
      else setStopwatch((s) => s + 1);
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
    if (!studentId) return null;
    const { data, error } = await supabase
      .from("workout_logs")
      .insert({ student_id: studentId, workout_plan_id: String(id) })
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
    if (confirm("Cancelar o treino? O progresso feito até agora não será salvo como concluído.")) {
      router.push("/aluno");
    }
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

  async function handlePhotoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !logId || !studentId) return;

    setUploadingPhoto(true);
    try {
      const path = `${studentId}/${logId}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("workout-photos")
        .upload(path, file, { contentType: file.type || "image/jpeg", upsert: true });

      if (!uploadError) {
        const { data } = supabase.storage.from("workout-photos").getPublicUrl(path);
        await supabase.from("workout_logs").update({ photo_url: data.publicUrl }).eq("id", logId);
      }
    } finally {
      setUploadingPhoto(false);
      router.push("/aluno");
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-volt border-t-transparent" />
      </div>
    );
  }

  if (mode === "done") {
    return (
      <div className="flex min-h-[80vh] flex-col justify-between">
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-volt">
            <span className="text-2xl font-black text-base-950">✓</span>
          </div>
          <h1 className="text-2xl font-extrabold text-base-100">Parabéns!</h1>
          <p className="mt-1 text-sm text-base-400">Treino concluído</p>

          <div className="mt-7 flex gap-8">
            <div className="text-center">
              <p className="text-lg font-extrabold text-base-100">{finalStats.duration}min</p>
              <p className="mt-1 text-[10px] font-semibold text-base-400">DURAÇÃO</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-extrabold text-base-100">{finalStats.volume}kg</p>
              <p className="mt-1 text-[10px] font-semibold text-base-400">VOLUME</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-extrabold text-base-100">{finalStats.reps}x</p>
              <p className="mt-1 text-[10px] font-semibold text-base-400">REPS</p>
            </div>
          </div>

          <p className="mt-8 text-sm text-base-400">Que tal guardar uma foto do seu progresso?</p>
        </div>

        <div className="space-y-3">
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handlePhotoSelected}
          />
          <button
            className="btn-primary w-full"
            onClick={() => photoInputRef.current?.click()}
            disabled={uploadingPhoto}
          >
            {uploadingPhoto ? "Enviando..." : "📷 Adicionar uma foto"}
          </button>
          <Link href="/aluno" className="block text-center text-sm text-base-400">
            Pular
          </Link>
        </div>
      </div>
    );
  }

  if (mode === "overview") {
    return (
      <div>
        <Link href="/aluno" className="text-sm font-bold text-volt">
          ‹ Voltar
        </Link>
        <h1 className="mb-6 mt-4 text-center text-2xl font-extrabold text-base-100">{planName}</h1>

        <div className="divide-y divide-base-800">
          {items.map((item) => (
            <div key={item.id} className="py-3.5">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-base-100">{item.exercise?.name}</p>
                {item.exercise?.video_url ? (
                  <a
                    href={item.exercise.video_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-volt"
                  >
                    ▶
                  </a>
                ) : null}
              </div>
              <p className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-base-400">
                <span>Séries:</span>
                {item.warmup_sets > 0 ? (
                  <span>
                    <span style={{ color: SET_TYPE_COLOR.warmup }}>●</span> {item.warmup_sets}
                  </span>
                ) : null}
                {item.prep_sets > 0 ? (
                  <span>
                    <span style={{ color: SET_TYPE_COLOR.prep }}>●</span> {item.prep_sets}
                  </span>
                ) : null}
                <span>
                  <span style={{ color: SET_TYPE_COLOR.valid }}>●</span> {item.sets}
                </span>
              </p>
              <p className="mt-0.5 text-xs text-base-400">Reps {item.reps}</p>
            </div>
          ))}
        </div>

        <button className="btn-primary mt-6 w-full" onClick={startWorkout}>
          ▶ Iniciar treino
        </button>
      </div>
    );
  }

  const item = items[currentIndex];
  const sets = setsByExercise[item.id] ?? [];
  const selectedIndex = selectedSetIndex[item.id] ?? sets.findIndex((s) => !s.completed);
  const activeIndex = selectedIndex === -1 ? 0 : selectedIndex;
  const activeSet = sets[activeIndex];
  const doneCount = sets.filter((s) => s.completed).length;

  return (
    <div>
      <div className="flex items-center justify-between">
        <button className="text-sm font-bold text-volt" onClick={() => setMode("overview")}>
          ‹ Voltar
        </button>
        <div className="text-center">
          <p className="text-[11px] text-base-400">Tempo total</p>
          <p className="text-sm font-bold text-base-100">{formatSeconds(elapsedSeconds)}</p>
        </div>
        <button className="text-xs font-semibold text-red-400" onClick={cancelWorkout}>
          Cancelar
        </button>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <button
          disabled={currentIndex === 0}
          onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
          className="px-3 text-3xl font-light text-base-100 disabled:opacity-20"
        >
          ‹
        </button>
        <h2 className="flex-1 text-center text-lg font-extrabold text-base-100">
          {item.exercise?.name}
        </h2>
        <button
          disabled={currentIndex === items.length - 1}
          onClick={() => setCurrentIndex((i) => Math.min(items.length - 1, i + 1))}
          className="px-3 text-3xl font-light text-base-100 disabled:opacity-20"
        >
          ›
        </button>
      </div>

      {item.exercise?.video_url ? (
        <a
          href={item.exercise.video_url}
          target="_blank"
          rel="noreferrer"
          className="mx-auto mt-4 block w-fit rounded-full border border-base-600 px-4 py-2 text-xs font-semibold text-volt"
        >
          ▶ Ver vídeo do exercício
        </a>
      ) : null}

      <div className="mt-5 space-y-1 text-center">
        {item.warmup_sets > 0 ? (
          <p className="text-sm font-semibold text-base-100">
            <span style={{ color: SET_TYPE_COLOR.warmup }}>● </span>
            Aquecimento {item.warmup_sets}
            {item.warmup_reps ? ` · ${item.warmup_reps} reps` : ""}
          </p>
        ) : null}
        {item.prep_sets > 0 ? (
          <p className="text-sm font-semibold text-base-100">
            <span style={{ color: SET_TYPE_COLOR.prep }}>● </span>
            Preparatória {item.prep_sets}
            {item.prep_reps ? ` · ${item.prep_reps} reps` : ""}
          </p>
        ) : null}
        <p className="text-sm font-semibold text-base-100">
          <span style={{ color: SET_TYPE_COLOR.valid }}>● </span>
          Válidas {item.sets} · Reps {item.reps} · Intervalo {item.rest_seconds}s
        </p>
      </div>

      <div className="mt-4 flex items-center justify-center gap-2">
        <span
          className={`flex h-[18px] w-[18px] items-center justify-center rounded border ${
            doneCount === sets.length && sets.length > 0
              ? "border-volt bg-volt"
              : "border-base-600"
          }`}
        >
          {doneCount === sets.length && sets.length > 0 ? (
            <span className="text-[10px] font-bold text-base-950">✓</span>
          ) : null}
        </span>
        <span className="text-sm font-semibold text-base-100">
          Exercício concluído · {doneCount}/{sets.length}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {sets.map((s, i) => (
          <button
            key={i}
            onClick={() => setSelectedSetIndex((prev) => ({ ...prev, [item.id]: i }))}
            className="flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5"
            style={{
              borderColor: SET_TYPE_COLOR[s.type],
              backgroundColor: i === activeIndex ? `${SET_TYPE_COLOR[s.type]}22` : "transparent",
            }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: SET_TYPE_COLOR[s.type] }}
            />
            <span className="text-xs font-bold text-base-100">{s.indexInType}ª</span>
            {s.completed ? <span className="text-[11px] font-bold text-volt">✓</span> : null}
          </button>
        ))}
      </div>

      {activeSet ? (
        <div className="card mt-4">
          <p className="text-center text-xs font-semibold text-base-400">
            {SET_TYPE_LABEL[activeSet.type]} · série {activeSet.indexInType}
          </p>
          <div className="mt-2.5 flex gap-3">
            <div className="flex-1">
              <input
                inputMode="decimal"
                placeholder="-"
                className="w-full rounded-xl border border-base-700 bg-base-900 py-3.5 text-center text-2xl font-bold text-base-100"
                value={activeSet.load_kg_done}
                onChange={(e) => updateSet(item.id, activeIndex, { load_kg_done: e.target.value })}
              />
              <p className="mt-1 text-center text-[11px] text-base-400">Peso (kg)</p>
            </div>
            <div className="flex-1">
              <input
                inputMode="numeric"
                placeholder="-"
                className="w-full rounded-xl border border-base-700 bg-base-900 py-3.5 text-center text-2xl font-bold text-base-100"
                value={activeSet.reps_done}
                onChange={(e) => updateSet(item.id, activeIndex, { reps_done: e.target.value })}
              />
              <p className="mt-1 text-center text-[11px] text-base-400">Reps feitas</p>
            </div>
          </div>
          <button
            className="btn-primary mt-3.5 w-full disabled:opacity-60"
            onClick={() => completeSet(item, activeIndex)}
            disabled={activeSet.completed}
          >
            {activeSet.completed ? "✓ Série concluída" : "✓ Concluir série"}
          </button>
        </div>
      ) : null}

      {item.notes ? (
        <div className="mt-4 border-l-2 border-volt pl-3">
          <p className="text-sm font-bold text-base-100">Observações do treinador</p>
          <p className="mt-0.5 text-sm text-base-400">{item.notes}</p>
        </div>
      ) : null}

      <div className="mt-7 flex flex-col items-center">
        <div className="flex rounded-full bg-base-800 p-1">
          <button
            className={`rounded-full px-4 py-1.5 text-xs font-semibold ${
              timerTab === "timer" ? "bg-volt text-base-950" : "text-base-400"
            }`}
            onClick={() => {
              setTimerTab("timer");
              setTimerRunning(false);
            }}
          >
            Timer
          </button>
          <button
            className={`rounded-full px-4 py-1.5 text-xs font-semibold ${
              timerTab === "stopwatch" ? "bg-volt text-base-950" : "text-base-400"
            }`}
            onClick={() => {
              setTimerTab("stopwatch");
              setTimerRunning(false);
            }}
          >
            Cronômetro
          </button>
        </div>

        <p className="mt-3.5 text-5xl font-extrabold text-base-100">
          {timerTab === "timer" ? formatSeconds(restRemaining) : formatSeconds(stopwatch)}
        </p>

        <div className="mt-2.5 flex items-center gap-4">
          <button
            className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-lg text-white"
            onClick={() => setTimerRunning((r) => !r)}
          >
            {timerRunning ? "⏸" : "▶"}
          </button>
          <button
            className="text-xl text-base-400"
            onClick={() => {
              setTimerRunning(false);
              if (timerTab === "timer") setRestRemaining(item.rest_seconds ?? 60);
              else setStopwatch(0);
            }}
          >
            ↻
          </button>
        </div>
      </div>

      <button
        className="btn-secondary mt-8 w-full"
        onClick={() => setShowFinishModal(true)}
      >
        Finalizar treino
      </button>

      {showFinishModal ? (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 p-5">
          <div className="w-full max-w-sm rounded-2xl bg-base-900 p-6">
            <h3 className="text-xl font-extrabold text-base-100">Finalizar treino</h3>
            <p className="mt-2 text-sm text-base-400">
              Tem certeza que deseja finalizar o treino atual?
            </p>

            <p className="mb-2.5 mt-4 text-sm font-semibold text-base-100">
              Como foi o esforço nesse treino? (opcional)
            </p>
            <div className="flex justify-between gap-1">
              {EFFORT_LABELS.map((e) => (
                <button
                  key={e.value}
                  onClick={() => setEffortRating(effortRating === e.value ? null : e.value)}
                  className={`flex flex-1 flex-col items-center gap-1 rounded-xl border py-2 ${
                    effortRating === e.value
                      ? "border-volt bg-volt/10"
                      : "border-base-700"
                  }`}
                >
                  <span className="text-xl">{e.emoji}</span>
                  <span className="text-[10px] font-semibold text-base-400">{e.label}</span>
                </button>
              ))}
            </div>

            <p className="mb-2.5 mt-4 text-sm font-semibold text-base-100">
              Observação sobre o treino (opcional)
            </p>
            <textarea
              className="input min-h-[80px]"
              placeholder="Ex: Treino intenso, senti dor no ombro..."
              value={finishNotes}
              onChange={(e) => setFinishNotes(e.target.value)}
            />

            <div className="mt-5 flex gap-3">
              <button
                className="btn-secondary flex-1"
                onClick={() => setShowFinishModal(false)}
                disabled={finishing}
              >
                Cancelar
              </button>
              <button className="btn-primary flex-1" onClick={confirmFinish} disabled={finishing}>
                {finishing ? "Finalizando..." : "Finalizar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
