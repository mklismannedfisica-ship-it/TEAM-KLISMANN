"use client";

import { useTransition } from "react";
import { cancelSlot } from "./actions";
import { formatDateLabel, formatTimeLabel } from "@ptapp/shared";

export type SlotWithBookings = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  capacity: number;
  canceled: boolean;
  bookings: { id: string; status: string; student: { full_name: string } | null }[];
};

export function SlotList({ slots }: { slots: SlotWithBookings[] }) {
  const [pending, startTransition] = useTransition();

  if (slots.length === 0) {
    return (
      <p className="text-sm text-base-400">
        Nenhuma vaga nos próximos dias. Cadastre um horário fixo acima para gerar vagas.
      </p>
    );
  }

  const byDate = new Map<string, SlotWithBookings[]>();
  for (const slot of slots) {
    const list = byDate.get(slot.date) ?? [];
    list.push(slot);
    byDate.set(slot.date, list);
  }

  return (
    <div className="space-y-5">
      {[...byDate.entries()].map(([date, daySlots]) => (
        <div key={date}>
          <p className="mb-2 text-sm font-semibold text-base-100">{formatDateLabel(date)}</p>
          <div className="space-y-2">
            {daySlots.map((slot) => {
              const booked = slot.bookings.filter((b) => b.status === "booked");
              const isFull = booked.length >= slot.capacity;
              return (
                <div
                  key={slot.id}
                  className="flex items-center justify-between rounded-lg border border-base-700 bg-base-800 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-base-100">
                      {formatTimeLabel(slot.start_time)} às {formatTimeLabel(slot.end_time)}
                    </p>
                    {booked.length > 0 ? (
                      <p className="mt-1 text-xs text-base-400">
                        {booked.map((b) => b.student?.full_name).join(", ")}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-base-400">
                        {isFull ? "Vaga esgotada" : `${slot.capacity - booked.length} vaga(s) livre(s)`}
                      </p>
                    )}
                  </div>
                  <button
                    className="btn-ghost text-red-400"
                    disabled={pending}
                    onClick={() =>
                      startTransition(() => {
                        void cancelSlot(slot.id);
                      })
                    }
                  >
                    Cancelar
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
