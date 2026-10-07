"use client";

import { useRef, useState, useTransition } from "react";
import { cancelSession, createSession, moveSession } from "./actions";
import { formatDateLabel, formatTimeLabel, type ClassSession } from "@ptapp/shared";

export type SessionWithStudent = ClassSession & { student: { full_name: string } | null };

export function SessionList({
  sessions,
  students,
}: {
  sessions: SessionWithStudent[];
  students: { id: string; full_name: string }[];
}) {
  const [pending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const addFormRef = useRef<HTMLFormElement>(null);

  function handleCancel(id: string) {
    startTransition(() => {
      void cancelSession(id);
    });
  }

  function handleMove(id: string, formData: FormData) {
    setError(null);
    startTransition(() => {
      void moveSession(id, formData)
        .then(() => setEditingId(null))
        .catch((e) => setError(e instanceof Error ? e.message : "Erro ao mover."));
    });
  }

  function handleAdd(formData: FormData) {
    setError(null);
    startTransition(() => {
      void createSession(formData)
        .then(() => {
          addFormRef.current?.reset();
          setAddOpen(false);
        })
        .catch((e) => setError(e instanceof Error ? e.message : "Erro ao adicionar."));
    });
  }

  const byDate = new Map<string, SessionWithStudent[]>();
  for (const session of sessions) {
    const list = byDate.get(session.date) ?? [];
    list.push(session);
    byDate.set(session.date, list);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-base-100">Próximas sessões</h2>
        {!addOpen ? (
          <button className="btn-secondary" onClick={() => setAddOpen(true)}>
            + Sessão avulsa
          </button>
        ) : null}
      </div>

      {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}

      {addOpen ? (
        <form
          ref={addFormRef}
          action={handleAdd}
          className="mt-4 grid grid-cols-2 gap-3 rounded-lg border border-base-700 bg-base-800 p-4 sm:grid-cols-5"
        >
          <div className="col-span-2">
            <label className="label" htmlFor="new_student_id">
              Aluno
            </label>
            <select id="new_student_id" name="student_id" required className="input">
              <option value="">Selecione...</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.full_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="new_date">
              Data
            </label>
            <input id="new_date" name="date" type="date" required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="new_start_time">
              Início
            </label>
            <input id="new_start_time" name="start_time" type="time" required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="new_end_time">
              Fim
            </label>
            <input id="new_end_time" name="end_time" type="time" required className="input" />
          </div>
          <div className="col-span-2 flex gap-3 sm:col-span-5">
            <button type="submit" className="btn-primary" disabled={pending}>
              Adicionar
            </button>
            <button type="button" className="btn-secondary" onClick={() => setAddOpen(false)}>
              Cancelar
            </button>
          </div>
        </form>
      ) : null}

      {sessions.length === 0 ? (
        <p className="mt-4 text-sm text-base-400">
          Nenhuma sessão nos próximos dias. Cadastre um aluno fixo acima ou adicione uma sessão
          avulsa.
        </p>
      ) : (
        <div className="mt-4 space-y-5">
          {[...byDate.entries()].map(([date, daySessions]) => (
            <div key={date}>
              <p className="mb-2 text-sm font-semibold text-base-100">{formatDateLabel(date)}</p>
              <div className="space-y-2">
                {daySessions.map((session) =>
                  editingId === session.id ? (
                    <form
                      key={session.id}
                      action={(formData) => handleMove(session.id, formData)}
                      className="grid grid-cols-3 gap-2 rounded-lg border border-base-700 bg-base-800 p-3"
                    >
                      <input
                        name="date"
                        type="date"
                        defaultValue={session.date}
                        required
                        className="input"
                      />
                      <input
                        name="start_time"
                        type="time"
                        defaultValue={session.start_time.slice(0, 5)}
                        required
                        className="input"
                      />
                      <input
                        name="end_time"
                        type="time"
                        defaultValue={session.end_time.slice(0, 5)}
                        required
                        className="input"
                      />
                      <div className="col-span-3 flex gap-2">
                        <button type="submit" className="btn-primary" disabled={pending}>
                          Salvar
                        </button>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => setEditingId(null)}
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div
                      key={session.id}
                      className="flex items-center justify-between rounded-lg border border-base-700 bg-base-800 px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-base-100">
                          {session.student?.full_name}
                        </p>
                        <p className="text-xs text-base-400">
                          {formatTimeLabel(session.start_time)} às {formatTimeLabel(session.end_time)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button className="btn-ghost" onClick={() => setEditingId(session.id)}>
                          Mover
                        </button>
                        <button
                          className="btn-ghost text-red-400"
                          disabled={pending}
                          onClick={() => handleCancel(session.id)}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
