"use client";

import { useState, useTransition } from "react";
import {
  CARDIO_ACTIVITY_LABELS,
  CARDIO_INTENSITY_LABELS,
  planValidityLabel,
  type CardioActivity,
  type CardioIntensity,
  type CardioSession,
} from "@ptapp/shared";
import { createCardioSession, deleteCardioSession, toggleCardioActive } from "./cardio-actions";

export function CardioBuilder({
  studentId,
  sessions,
}: {
  studentId: string;
  sessions: CardioSession[];
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const sorted = [...sessions].sort((a, b) => a.order_index - b.order_index);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-base-400">
          Sessões de cardio prescritas para este aluno.
        </p>
        <button className="btn-primary" onClick={() => setShowAdd((v) => !v)}>
          {showAdd ? "Cancelar" : "+ Nova sessão"}
        </button>
      </div>

      {error ? <p className="mb-4 text-sm text-red-400">{error}</p> : null}

      {showAdd ? (
        <CardioForm
          studentId={studentId}
          onDone={() => setShowAdd(false)}
          onError={setError}
        />
      ) : null}

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {sorted.length === 0 ? (
          <div className="card text-center text-sm text-base-400 sm:col-span-2">
            Nenhuma sessão de cardio cadastrada ainda.
          </div>
        ) : (
          sorted.map((session) => {
            const validity = planValidityLabel(session.valid_until);
            return (
              <div key={session.id} className="card">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-base-100">{session.name}</p>
                    <p className="mt-1 text-xs text-base-400">
                      {CARDIO_ACTIVITY_LABELS[session.activity]} ·{" "}
                      {CARDIO_INTENSITY_LABELS[session.intensity]} · {session.duration_minutes}min
                    </p>
                    {session.instructions ? (
                      <p className="mt-2 text-xs text-base-400">{session.instructions}</p>
                    ) : null}
                  </div>
                  <span className="badge shrink-0">{session.active ? "Ativa" : "Inativa"}</span>
                </div>
                {validity ? (
                  <span
                    className={`badge mt-3 inline-block ${
                      validity.status === "expired"
                        ? "border-red-900 bg-red-950/50 text-red-400"
                        : validity.status === "soon"
                          ? "border-amber-900 bg-amber-950/50 text-amber-400"
                          : ""
                    }`}
                  >
                    {validity.label}
                  </span>
                ) : null}
                <div className="mt-3 flex gap-3">
                  <button
                    className="btn-ghost text-xs"
                    disabled={pending}
                    onClick={() =>
                      startTransition(() =>
                        void toggleCardioActive(session.id, studentId, !session.active)
                      )
                    }
                  >
                    {session.active ? "Marcar inativa" : "Reativar"}
                  </button>
                  <button
                    className="btn-ghost text-xs text-red-400 hover:text-red-300"
                    disabled={pending}
                    onClick={() => {
                      if (confirm(`Excluir "${session.name}"?`)) {
                        startTransition(() => void deleteCardioSession(session.id, studentId));
                      }
                    }}
                  >
                    Excluir
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function CardioForm({
  studentId,
  onDone,
  onError,
}: {
  studentId: string;
  onDone: () => void;
  onError: (msg: string | null) => void;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="card mb-4 space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onError(null);
        const formData = new FormData(e.currentTarget);
        const name = String(formData.get("name") || "").trim();
        if (!name) {
          onError("Dê um nome para a sessão.");
          return;
        }
        const submit = async () => {
          try {
            await createCardioSession(studentId, {
              name,
              activity: String(formData.get("activity")) as CardioActivity,
              intensity: String(formData.get("intensity")) as CardioIntensity,
              duration_minutes: Number(formData.get("duration_minutes")) || 20,
              instructions: String(formData.get("instructions") || "").trim() || null,
              valid_until: String(formData.get("valid_until") || "") || null,
            });
            onDone();
          } catch (err) {
            onError(err instanceof Error ? err.message : "Erro ao salvar.");
          }
        };
        startTransition(() => {
          void submit();
        });
      }}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Nome</label>
          <input name="name" required className="input" placeholder="Esteira - HIIT" />
        </div>
        <div>
          <label className="label">Atividade</label>
          <select name="activity" required className="input" defaultValue="walking">
            {Object.entries(CARDIO_ACTIVITY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Intensidade</label>
          <select name="intensity" required className="input" defaultValue="moderate">
            {Object.entries(CARDIO_INTENSITY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Duração (min)</label>
          <input
            name="duration_minutes"
            type="number"
            min={1}
            defaultValue={20}
            className="input"
          />
        </div>
        <div>
          <label className="label">Válido até (opcional)</label>
          <input name="valid_until" type="date" className="input" />
        </div>
      </div>
      <div>
        <label className="label">Instruções (opcional)</label>
        <textarea name="instructions" rows={2} className="input" placeholder="Ex: manter FC entre 130-150bpm" />
      </div>
      <div className="flex gap-3">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Salvando..." : "Salvar sessão"}
        </button>
        <button type="button" className="btn-secondary" onClick={onDone}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
