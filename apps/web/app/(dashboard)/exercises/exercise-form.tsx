"use client";

import { useRef, useState, useTransition } from "react";
import { createExercise } from "./actions";
import { MUSCLE_GROUP_LABELS, type MuscleGroup } from "@ptapp/shared";

export function ExerciseForm() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  if (!open) {
    return (
      <button className="btn-primary" onClick={() => setOpen(true)}>
        + Novo exercício
      </button>
    );
  }

  return (
    <div className="card mb-6">
      <form
        ref={formRef}
        action={(formData) => {
          setError(null);
          const submit = async () => {
            try {
              await createExercise(formData);
              formRef.current?.reset();
              setOpen(false);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Erro ao salvar.");
            }
          };
          startTransition(() => {
            void submit();
          });
        }}
        className="space-y-4"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="name">
              Nome do exercício
            </label>
            <input id="name" name="name" required className="input" placeholder="Supino reto" />
          </div>
          <div>
            <label className="label" htmlFor="muscle_group">
              Grupo muscular
            </label>
            <select id="muscle_group" name="muscle_group" required className="input">
              <option value="">Selecione...</option>
              {(Object.entries(MUSCLE_GROUP_LABELS) as [MuscleGroup, string][]).map(
                ([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                )
              )}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="equipment">
              Equipamento (opcional)
            </label>
            <input id="equipment" name="equipment" className="input" placeholder="Barra, halteres..." />
          </div>
          <div>
            <label className="label" htmlFor="video_url">
              Link do vídeo (opcional)
            </label>
            <input
              id="video_url"
              name="video_url"
              className="input"
              placeholder="https://..."
            />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="instructions">
            Instruções de execução (opcional)
          </label>
          <textarea id="instructions" name="instructions" rows={3} className="input" />
        </div>

        {error ? <p className="text-sm text-red-400">{error}</p> : null}

        <div className="flex gap-3">
          <button type="submit" className="btn-primary" disabled={pending}>
            {pending ? "Salvando..." : "Salvar exercício"}
          </button>
          <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
