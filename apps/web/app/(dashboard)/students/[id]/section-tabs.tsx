"use client";

import { useState, type ReactNode } from "react";

export function StudentSections({
  workouts,
  cardio,
}: {
  workouts: ReactNode;
  cardio: ReactNode;
}) {
  const [tab, setTab] = useState<"workouts" | "cardio">("workouts");

  return (
    <div>
      <div className="mb-6 inline-flex rounded-full border border-base-700 bg-base-900 p-1">
        <button
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
            tab === "workouts" ? "bg-volt text-base-950" : "text-base-400"
          }`}
          onClick={() => setTab("workouts")}
        >
          Treinos
        </button>
        <button
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
            tab === "cardio" ? "bg-volt text-base-950" : "text-base-400"
          }`}
          onClick={() => setTab("cardio")}
        >
          Cardio
        </button>
      </div>

      <div style={{ display: tab === "workouts" ? "block" : "none" }}>{workouts}</div>
      <div style={{ display: tab === "cardio" ? "block" : "none" }}>{cardio}</div>
    </div>
  );
}
