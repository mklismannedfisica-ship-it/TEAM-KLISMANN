"use client";

import { useMemo, useState, useTransition } from "react";
import {
  MUSCLE_GROUP_LABELS,
  planValidityLabel,
  type Exercise,
  type WorkoutPlan,
  type WorkoutPlanExercise,
} from "@ptapp/shared";
import {
  addExerciseToPlan,
  createWorkoutPlan,
  deleteWorkoutPlan,
  removeExerciseFromPlan,
  togglePlanActive,
} from "./actions";

type PlanWithExercises = WorkoutPlan & { workout_plan_exercises: WorkoutPlanExercise[] };

export function PlanBuilder({
  studentId,
  plans,
  exercises,
}: {
  studentId: string;
  plans: PlanWithExercises[];
  exercises: Exercise[];
}) {
  const [activePlanId, setActivePlanId] = useState<string | null>(plans[0]?.id ?? null);
  const [creatingPlan, setCreatingPlan] = useState(false);
  const [newPlanName, setNewPlanName] = useState("");
  const [newPlanValidUntil, setNewPlanValidUntil] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const activePlan = plans.find((p) => p.id === activePlanId) ?? null;

  function handleCreatePlan() {
    setError(null);
    startTransition(async () => {
      try {
        await createWorkoutPlan(studentId, newPlanName, newPlanValidUntil || null);
        setNewPlanName("");
        setNewPlanValidUntil("");
        setCreatingPlan(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao criar ficha.");
      }
    });
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {plans.map((plan) => {
          const validity = planValidityLabel(plan.valid_until);
          return (
            <button
              key={plan.id}
              onClick={() => setActivePlanId(plan.id)}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                plan.id === activePlanId
                  ? "bg-volt text-base-950"
                  : "border border-base-600 bg-base-800 text-base-200 hover:border-base-400"
              }`}
            >
              {plan.name}
              {!plan.active ? " (inativa)" : ""}
              {validity ? (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    plan.id === activePlanId
                      ? "bg-base-950/20 text-base-950"
                      : validity.status === "expired"
                        ? "bg-red-950 text-red-400"
                        : validity.status === "soon"
                          ? "bg-amber-950 text-amber-400"
                          : "bg-base-700 text-base-400"
                  }`}
                >
                  {validity.label}
                </span>
              ) : null}
            </button>
          );
        })}

        {creatingPlan ? (
          <div className="flex flex-wrap items-center gap-2">
            <input
              autoFocus
              className="input w-40"
              placeholder="Ex: Treino A"
              value={newPlanName}
              onChange={(e) => setNewPlanName(e.target.value)}
            />
            <input
              type="date"
              className="input w-40"
              value={newPlanValidUntil}
              onChange={(e) => setNewPlanValidUntil(e.target.value)}
              title="Válido até (opcional)"
            />
            <button className="btn-primary px-3 py-2" disabled={pending} onClick={handleCreatePlan}>
              Criar
            </button>
            <button className="btn-ghost px-3 py-2" onClick={() => setCreatingPlan(false)}>
              ✕
            </button>
          </div>
        ) : (
          <button
            className="rounded-full border border-dashed border-base-600 px-4 py-2 text-sm font-medium text-base-400 hover:border-volt hover:text-volt"
            onClick={() => setCreatingPlan(true)}
          >
            + Nova ficha
          </button>
        )}
      </div>

      {error ? <p className="mb-4 text-sm text-red-400">{error}</p> : null}

      {activePlan ? (
        <PlanDetail studentId={studentId} plan={activePlan} exercises={exercises} />
      ) : (
        <div className="card text-center text-sm text-base-400">
          Crie a primeira ficha de treino para este aluno (ex: &quot;Treino A&quot;).
        </div>
      )}
    </div>
  );
}

function PlanDetail({
  studentId,
  plan,
  exercises,
}: {
  studentId: string;
  plan: PlanWithExercises;
  exercises: Exercise[];
}) {
  const [pending, startTransition] = useTransition();
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sortedExercises = [...plan.workout_plan_exercises].sort(
    (a, b) => a.order_index - b.order_index
  );

  const volumeByMuscleGroup = useMemo(() => {
    const totals = new Map<string, number>();
    for (const pe of sortedExercises) {
      const group = pe.exercise?.muscle_group;
      if (!group) continue;
      totals.set(group, (totals.get(group) ?? 0) + pe.sets);
    }
    return Array.from(totals.entries()).sort((a, b) => b[1] - a[1]);
  }, [sortedExercises]);

  return (
    <div className="card">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold text-base-100">{plan.name}</h2>
        <div className="flex gap-2">
          <button
            className="btn-ghost text-xs"
            disabled={pending}
            onClick={() =>
              startTransition(() => togglePlanActive(plan.id, studentId, !plan.active))
            }
          >
            {plan.active ? "Marcar inativa" : "Reativar"}
          </button>
          <button
            className="btn-ghost text-xs text-red-400 hover:text-red-300"
            disabled={pending}
            onClick={() => {
              if (confirm(`Excluir a ficha "${plan.name}"?`)) {
                startTransition(() => deleteWorkoutPlan(plan.id, studentId));
              }
            }}
          >
            Excluir ficha
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {sortedExercises.length === 0 ? (
          <p className="text-sm text-base-400">Nenhum exercício nesta ficha ainda.</p>
        ) : (
          sortedExercises.map((pe) => (
            <div
              key={pe.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-base-700 bg-base-800 px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-base-100">{pe.exercise?.name}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {pe.warmup_sets > 0 ? (
                    <span className="badge border-red-900 bg-red-950/50 text-red-400">
                      Aquec. {pe.warmup_sets}{pe.warmup_reps ? ` · ${pe.warmup_reps}` : ""}
                    </span>
                  ) : null}
                  {pe.prep_sets > 0 ? (
                    <span className="badge border-amber-900 bg-amber-950/50 text-amber-400">
                      Prep. {pe.prep_sets}{pe.prep_reps ? ` · ${pe.prep_reps}` : ""}
                    </span>
                  ) : null}
                  <span className="badge border-volt/40 text-volt">
                    Válidas {pe.sets}x{pe.reps}
                  </span>
                  {pe.load_kg ? <span className="badge">{pe.load_kg}kg</span> : null}
                  <span className="badge">descanso {pe.rest_seconds}s</span>
                </div>
              </div>
              <button
                className="text-xs text-red-400 hover:text-red-300"
                disabled={pending}
                onClick={() => startTransition(() => removeExerciseFromPlan(pe.id, studentId))}
              >
                Remover
              </button>
            </div>
          ))
        )}
      </div>

      {volumeByMuscleGroup.length > 0 ? (
        <div className="mt-5 border-t border-base-700 pt-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-base-400">
            Volume por grupo muscular (séries válidas)
          </p>
          <div className="flex flex-wrap gap-2">
            {volumeByMuscleGroup.map(([group, total]) => (
              <span key={group} className="badge">
                {MUSCLE_GROUP_LABELS[group as keyof typeof MUSCLE_GROUP_LABELS]}: {total}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}

      {showAdd ? (
        <AddExerciseForm
          studentId={studentId}
          planId={plan.id}
          exercises={exercises}
          onDone={() => setShowAdd(false)}
          onError={setError}
        />
      ) : (
        <button className="btn-secondary mt-4" onClick={() => setShowAdd(true)}>
          + Adicionar exercício
        </button>
      )}
    </div>
  );
}

function AddExerciseForm({
  studentId,
  planId,
  exercises,
  onDone,
  onError,
}: {
  studentId: string;
  planId: string;
  exercises: Exercise[];
  onDone: () => void;
  onError: (msg: string | null) => void;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="mt-4 space-y-3 rounded-lg border border-base-700 bg-base-800 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        onError(null);
        const formData = new FormData(e.currentTarget);
        const exercise_id = String(formData.get("exercise_id"));
        if (!exercise_id) {
          onError("Selecione um exercício.");
          return;
        }
        startTransition(async () => {
          try {
            await addExerciseToPlan(planId, studentId, {
              exercise_id,
              sets: Number(formData.get("sets")) || 3,
              reps: String(formData.get("reps") || "10-12"),
              rest_seconds: Number(formData.get("rest_seconds")) || 60,
              load_kg: formData.get("load_kg") ? Number(formData.get("load_kg")) : null,
              notes: null,
              warmup_sets: Number(formData.get("warmup_sets")) || 0,
              warmup_reps: String(formData.get("warmup_reps") || "") || null,
              prep_sets: Number(formData.get("prep_sets")) || 0,
              prep_reps: String(formData.get("prep_reps") || "") || null,
            });
            onDone();
          } catch (err) {
            onError(err instanceof Error ? err.message : "Erro ao adicionar exercício.");
          }
        });
      }}
    >
      <div>
        <label className="label">Exercício</label>
        <select name="exercise_id" required className="input">
          <option value="">Selecione...</option>
          {exercises.map((ex) => (
            <option key={ex.id} value={ex.id}>
              {ex.name} · {MUSCLE_GROUP_LABELS[ex.muscle_group]}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <label className="label">Séries válidas</label>
          <input name="sets" type="number" min={1} defaultValue={3} className="input" />
        </div>
        <div>
          <label className="label">Repetições</label>
          <input name="reps" defaultValue="10-12" className="input" />
        </div>
        <div>
          <label className="label">Carga (kg)</label>
          <input name="load_kg" type="number" step="0.5" className="input" />
        </div>
        <div>
          <label className="label">Descanso (s)</label>
          <input name="rest_seconds" type="number" defaultValue={60} className="input" />
        </div>
      </div>

      <div className="rounded-lg border border-base-700 bg-base-900 p-3">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-base-400">
          Séries de aquecimento e preparatórias (opcional)
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <label className="label">Aquec. — séries</label>
            <input name="warmup_sets" type="number" min={0} defaultValue={0} className="input" />
          </div>
          <div>
            <label className="label">Aquec. — reps</label>
            <input name="warmup_reps" placeholder="10-12" className="input" />
          </div>
          <div>
            <label className="label">Prep. — séries</label>
            <input name="prep_sets" type="number" min={0} defaultValue={0} className="input" />
          </div>
          <div>
            <label className="label">Prep. — reps</label>
            <input name="prep_reps" placeholder="4-6" className="input" />
          </div>
        </div>
      </div>

      <div className="flex items-end gap-2">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Adicionando..." : "Adicionar"}
        </button>
        <button type="button" className="btn-secondary" onClick={onDone}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
