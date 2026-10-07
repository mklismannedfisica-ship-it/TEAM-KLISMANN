"use client";

import { useTransition } from "react";
import { markConfirmationSent, markFeedbackSent } from "./actions";
import { formatDateLabel, formatTimeLabel, buildWhatsAppLink } from "@ptapp/shared";

export type SessionForMessage = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  confirmation_sent: boolean;
  feedback_sent: boolean;
  student: { full_name: string; phone: string | null } | null;
};

export function MessageList({
  title,
  description,
  sessions,
  buildMessage,
  onSent,
  emptyLabel,
}: {
  title: string;
  description: string;
  sessions: SessionForMessage[];
  buildMessage: (session: SessionForMessage) => string;
  onSent: "confirmation" | "feedback";
  emptyLabel: string;
}) {
  const [pending, startTransition] = useTransition();

  function handleSent(id: string) {
    startTransition(() => {
      void (onSent === "confirmation" ? markConfirmationSent(id) : markFeedbackSent(id));
    });
  }

  return (
    <div className="card">
      <h2 className="text-base font-semibold text-base-100">{title}</h2>
      <p className="mt-1 text-sm text-base-400">{description}</p>

      {sessions.length === 0 ? (
        <p className="mt-4 text-sm text-base-400">{emptyLabel}</p>
      ) : (
        <div className="mt-4 space-y-2">
          {sessions.map((session) => {
            const phone = session.student?.phone;
            return (
              <div
                key={session.id}
                className="flex items-center justify-between rounded-lg border border-base-700 bg-base-800 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-base-100">{session.student?.full_name}</p>
                  <p className="text-xs text-base-400">
                    {formatDateLabel(session.date)} · {formatTimeLabel(session.start_time)}
                  </p>
                </div>
                <div className="flex gap-2">
                  {phone ? (
                    <a
                      href={buildWhatsAppLink(phone, buildMessage(session))}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-secondary"
                    >
                      Abrir WhatsApp
                    </a>
                  ) : (
                    <span className="text-xs text-base-500">Sem telefone cadastrado</span>
                  )}
                  <button
                    className="btn-ghost"
                    disabled={pending}
                    onClick={() => handleSent(session.id)}
                  >
                    Marcar enviada
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
