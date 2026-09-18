"use client";

import { useState, useTransition } from "react";
import { bookSlot, cancelBooking } from "./actions";
import { formatDateLabel, formatTimeLabel } from "@ptapp/shared";

export type SlotWithBookings = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  capacity: number;
  bookings: { status: string; student_id: string }[];
};

export type MyBooking = {
  id: string;
  slot: { date: string; start_time: string; end_time: string } | null;
};

export function BookingList({
  slots,
  myBookings,
  studentId,
}: {
  slots: SlotWithBookings[];
  myBookings: MyBooking[];
  studentId: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleBook(slotId: string) {
    setError(null);
    startTransition(() => {
      void bookSlot(slotId).catch((e) => setError(e instanceof Error ? e.message : "Erro ao marcar."));
    });
  }

  function handleCancel(bookingId: string) {
    setError(null);
    startTransition(() => {
      void cancelBooking(bookingId).catch((e) =>
        setError(e instanceof Error ? e.message : "Erro ao cancelar.")
      );
    });
  }

  const byDate = new Map<string, SlotWithBookings[]>();
  for (const slot of slots) {
    const list = byDate.get(slot.date) ?? [];
    list.push(slot);
    byDate.set(slot.date, list);
  }

  return (
    <div className="space-y-8">
      <div className="card">
        <h2 className="text-base font-semibold text-base-100">Minhas reposições marcadas</h2>
        {myBookings.length === 0 ? (
          <p className="mt-3 text-sm text-base-400">Você ainda não marcou nenhuma reposição.</p>
        ) : (
          <div className="mt-4 space-y-2">
            {myBookings.map((booking) =>
              booking.slot ? (
                <div
                  key={booking.id}
                  className="flex items-center justify-between rounded-lg border border-base-700 bg-base-800 px-4 py-3"
                >
                  <p className="text-sm font-medium text-base-100">
                    {formatDateLabel(booking.slot.date)} · {formatTimeLabel(booking.slot.start_time)} às{" "}
                    {formatTimeLabel(booking.slot.end_time)}
                  </p>
                  <button
                    className="btn-ghost text-red-400"
                    disabled={pending}
                    onClick={() => handleCancel(booking.id)}
                  >
                    Cancelar
                  </button>
                </div>
              ) : null
            )}
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="text-base font-semibold text-base-100">Horários disponíveis</h2>
        {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}
        {slots.length === 0 ? (
          <p className="mt-3 text-sm text-base-400">
            Seu personal ainda não abriu vagas de reposição.
          </p>
        ) : (
          <div className="mt-4 space-y-5">
            {[...byDate.entries()].map(([date, daySlots]) => (
              <div key={date}>
                <p className="mb-2 text-sm font-semibold text-base-100">{formatDateLabel(date)}</p>
                <div className="space-y-2">
                  {daySlots.map((slot) => {
                    const booked = slot.bookings.filter((b) => b.status === "booked");
                    const alreadyBooked = booked.some((b) => b.student_id === studentId);
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
                          <p className="mt-0.5 text-xs text-base-400">
                            {isFull ? "Esgotado" : `${slot.capacity - booked.length} vaga(s) livre(s)`}
                          </p>
                        </div>
                        <button
                          className="btn-primary"
                          disabled={pending || isFull || alreadyBooked}
                          onClick={() => handleBook(slot.id)}
                        >
                          {alreadyBooked ? "Marcado" : isFull ? "Esgotado" : "Marcar"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
