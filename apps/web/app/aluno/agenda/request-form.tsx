"use client";

import { useRef, useState, useTransition } from "react";
import { requestReschedule } from "./actions";
import { formatDateLabel, formatTimeLabel, type ClassSession } from "@ptapp/shared";

export function RequestForm({ sessions }: { sessions: ClassSession[] }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  if (!open) {
    return (
      <button className="btn-secondary" onClick={() => setOpen(true)}>
        Pedir outro horário
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={(formData) => {
        setError(null);
        const submit = async () => {
          try {
            await requestReschedule(formData);
            formRef.current?.reset();
            setOpen(false);
          } catch (e) {
            setError(e instanceof Error ? e.message : "Erro ao enviar pedido.");
          }
        };
        startTransition(() => {
          void submit();
        });
      }}
      className="space-y-4 rounded-lg border border-base-700 bg-base-800 p-4"
    >
      {sessions.length > 0 ? (
        <div>
          <label className="label" htmlFor="session_id">
            Qual treino você quer trocar? (opcional)
          </label>
          <select id="session_id" name="session_id" className="input">
            <option value="">Não é nenhum destes, é um pedido novo</option>
            {sessions.map((session) => (
              <option key={session.id} value={session.id}>
                {formatDateLabel(session.date)} · {formatTimeLabel(session.start_time)}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="requested_date">
            Data desejada
          </label>
          <input
            id="requested_date"
            name="requested_date"
            type="date"
            required
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="requested_start_time">
            Início
          </label>
          <input
            id="requested_start_time"
            name="requested_start_time"
            type="time"
            required
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="requested_end_time">
            Fim
          </label>
          <input
            id="requested_end_time"
            name="requested_end_time"
            type="time"
            required
            className="input"
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="note">
          Mensagem (opcional)
        </label>
        <textarea id="note" name="note" rows={2} className="input" placeholder="Explique o motivo..." />
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <div className="flex gap-3">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Enviando..." : "Enviar pedido"}
        </button>
        <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
