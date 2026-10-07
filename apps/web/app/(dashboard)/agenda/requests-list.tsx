"use client";

import { useState, useTransition } from "react";
import { resolveRequest } from "./actions";
import { formatDateLabel, formatTimeLabel, type RescheduleRequest } from "@ptapp/shared";

export type RequestWithStudent = RescheduleRequest & { student: { full_name: string } | null };

export function RequestsList({ requests }: { requests: RequestWithStudent[] }) {
  const [pending, startTransition] = useTransition();
  const [decliningId, setDecliningId] = useState<string | null>(null);

  function handleApprove(id: string) {
    startTransition(() => {
      void resolveRequest(id, "approved", null);
    });
  }

  function handleDecline(id: string, note: string) {
    startTransition(() => {
      void resolveRequest(id, "declined", note || null).then(() => setDecliningId(null));
    });
  }

  if (requests.length === 0) return null;

  return (
    <div className="card border-amber-900/60">
      <h2 className="text-base font-semibold text-base-100">Pedidos de troca de horário</h2>
      <div className="mt-4 space-y-3">
        {requests.map((request) => (
          <div key={request.id} className="rounded-lg border border-base-700 bg-base-800 px-4 py-3">
            <p className="text-sm font-medium text-base-100">{request.student?.full_name}</p>
            <p className="mt-0.5 text-xs text-base-400">
              Quer {formatDateLabel(request.requested_date)} às{" "}
              {formatTimeLabel(request.requested_start_time)}
            </p>
            {request.note ? (
              <p className="mt-1 text-xs italic text-base-500">&quot;{request.note}&quot;</p>
            ) : null}

            {decliningId === request.id ? (
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  autoFocus
                  placeholder="Motivo (opcional)"
                  className="input"
                  id={`note-${request.id}`}
                />
                <div className="flex gap-2">
                  <button
                    className="btn-secondary"
                    disabled={pending}
                    onClick={() =>
                      handleDecline(
                        request.id,
                        (document.getElementById(`note-${request.id}`) as HTMLInputElement)?.value ?? ""
                      )
                    }
                  >
                    Confirmar recusa
                  </button>
                  <button className="btn-ghost" onClick={() => setDecliningId(null)}>
                    Voltar
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-3 flex gap-2">
                <button className="btn-primary" disabled={pending} onClick={() => handleApprove(request.id)}>
                  Aprovar
                </button>
                <button
                  className="btn-ghost text-red-400"
                  disabled={pending}
                  onClick={() => setDecliningId(request.id)}
                >
                  Recusar
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
