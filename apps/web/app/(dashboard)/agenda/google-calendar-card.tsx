"use client";

import { useTransition } from "react";
import { disconnectGoogleCalendar } from "./actions";

export function GoogleCalendarCard({
  connected,
  configured,
}: {
  connected: boolean;
  configured: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-base-100">Google Calendar</h2>
          <p className="mt-1 text-sm text-base-400">
            {connected
              ? "Conectado. Toda sessão que você criar ou mover aqui aparece no seu Google Calendar — e no iPhone, se você tiver a conta Google adicionada em Ajustes > Calendário."
              : "Conecte sua conta pra ver essa agenda direto no Google Calendar e no iPhone."}
          </p>
        </div>

        {connected ? (
          <button
            className="btn-ghost text-red-400"
            disabled={pending}
            onClick={() => startTransition(() => void disconnectGoogleCalendar())}
          >
            Desconectar
          </button>
        ) : configured ? (
          <a href="/api/google/connect" className="btn-primary">
            Conectar
          </a>
        ) : (
          <span className="badge">Ainda não configurado</span>
        )}
      </div>
    </div>
  );
}
