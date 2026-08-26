"use client";

import { useTransition } from "react";
import { deleteExercise } from "./actions";
import { MUSCLE_GROUP_LABELS, type Exercise } from "@ptapp/shared";

export function ExerciseList({ exercises }: { exercises: Exercise[] }) {
  const [pending, startTransition] = useTransition();

  if (exercises.length === 0) {
    return (
      <div className="card text-center text-sm text-base-400">
        Nenhum exercício cadastrado ainda. Adicione o primeiro acima.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {exercises.map((ex) => (
        <div key={ex.id} className="card flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-medium text-base-100">{ex.name}</h3>
            <span className="badge">{MUSCLE_GROUP_LABELS[ex.muscle_group]}</span>
          </div>
          {ex.equipment ? <p className="text-xs text-base-400">Equipamento: {ex.equipment}</p> : null}
          {ex.video_url ? (
            <a
              href={ex.video_url}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-medium text-volt hover:underline"
            >
              Ver vídeo de execução →
            </a>
          ) : null}
          <button
            className="btn-ghost mt-2 self-start px-0 text-xs text-red-400 hover:bg-transparent hover:text-red-300"
            disabled={pending}
            onClick={() => startTransition(() => deleteExercise(ex.id))}
          >
            Remover
          </button>
        </div>
      ))}
    </div>
  );
}
