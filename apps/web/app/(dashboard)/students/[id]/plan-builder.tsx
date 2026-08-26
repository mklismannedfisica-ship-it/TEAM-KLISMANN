"use client";

import { useState, useTransition } from "react";
import { MUSCLE_GROUP_LABELS, type Exercise, type WorkoutPlan, type WorkoutPlanExercise } from "@ptapp/shared";
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
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const activePlan = plans.find((p) => p.id === activePlanId) ?? null;

  function handleCreatePlan() {
    setError(null);
    startTransition(async () => {
      try {
        await createWorkoutPlan(studentId, newPlanName);
        setNewPlanName("");
        setCreatingPlan(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao criar ficha.");
      }
    });
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {plans.map((plan) => (
          <button
            key={plan.id}
            onClick={() => setActivePlanId(plan.id)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              plan.id === activePlanId
                ? "bg-volt text-base-950"
                : "border border-base-600 bg-base-800 text-base-200 hover:border-base-400"
            }`}
          >
            {plan.name}
            {!plan.active ? " (inativa)" : ""}
          </button>
        ))}

        {creatingPlan ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              className="input w-40"
              placeholder="Ex: Treino A"
              value={newPlanName}
              onChange={(e) => setNewPlanName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreatePlan()}
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
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-base-700 bg-base-800 px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-base-100">{pe.exercise?.name}</p>
                <p className="text-xs text-base-400">
                  {pe.sets}x{pe.reps}
                  {pe.load_kg ? ` · ${pe.load_kg}kg` : ""} · descanso {pe.rest_seconds}s
                </p>
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
      className="mt-4 grid grid-cols-2 gap-3 rounded-lg border border-base-700 bg-base-800 p-4 sm:grid-cols-5"
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
            });
            onDone();
          } catch (err) {
            onError(err instanceof Error ? err.message : "Erro ao adicionar exercício.");
          }
        });
      }}
    >
      <div className="col-span-2 sm:col-span-2">
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
      <div>
        <label className="label">Séries</label>
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
      <div className="col-span-2 flex items-end gap-2 sm:col-span-5">
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
