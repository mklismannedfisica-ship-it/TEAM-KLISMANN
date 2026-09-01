"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  CARDIO_ACTIVITY_LABELS,
  CARDIO_INTENSITY_LABELS,
  type CardioSession,
} from "@ptapp/shared";
import { createClient } from "@/lib/supabase/client";

function formatSeconds(total: number) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function CardioExecutionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [session, setSession] = useState<CardioSession | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setStudentId(user?.id ?? null);

      const { data } = await supabase.from("cardio_sessions").select("*").eq("id", id).single();
      setSession(data);
      setLoading(false);
    }
    load();
  }, [id]);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, [running]);

  async function finish() {
    if (!studentId || !session) return;
    setSaving(true);
    await supabase.from("cardio_logs").insert({
      student_id: studentId,
      cardio_session_id: session.id,
      duration_minutes_done: Math.round(elapsed / 60),
    });
    setSaving(false);
    setDone(true);
  }

  if (loading || !session) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-volt border-t-transparent" />
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
        <p className="text-5xl">🔥</p>
        <h1 className="mt-3 text-xl font-bold text-base-100">Cardio concluído!</h1>
        <p className="mt-1.5 text-sm text-base-400">
          {Math.round(elapsed / 60)}min de {session.name}
        </p>
        <button className="btn-primary mt-6 px-8" onClick={() => router.push("/aluno/cardio")}>
          Voltar
        </button>
      </div>
    );
  }

  const targetSeconds = session.duration_minutes * 60;
  const progress = Math.min(1, elapsed / targetSeconds);

  return (
    <div>
      <Link href="/aluno/cardio" className="text-sm font-bold text-volt">
        ‹ Voltar
      </Link>

      <div className="mt-8 flex flex-col items-center text-center">
        <h1 className="text-2xl font-extrabold text-base-100">{session.name}</h1>
        <p className="mt-1.5 text-sm text-base-400">
          {CARDIO_ACTIVITY_LABELS[session.activity]} · {CARDIO_INTENSITY_LABELS[session.intensity]}{" "}
          · meta {session.duration_minutes}min
        </p>

        {session.instructions ? (
          <div className="mt-5 w-full border-l-2 border-volt pl-3 text-left">
            <p className="text-sm font-bold text-base-100">Instruções do treinador</p>
            <p className="mt-0.5 text-sm text-base-400">{session.instructions}</p>
          </div>
        ) : null}

        <div className="mt-8 h-2 w-full overflow-hidden rounded-full bg-base-800">
          <div
            className="h-full rounded-full bg-volt"
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        <p className="mt-6 text-6xl font-extrabold text-base-100">{formatSeconds(elapsed)}</p>
        <p className="mt-1 text-sm text-base-400">meta {formatSeconds(targetSeconds)}</p>

        <button
          className="mt-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-2xl text-white"
          onClick={() => setRunning((r) => !r)}
        >
          {running ? "⏸" : "▶"}
        </button>
      </div>

      <button
        className="btn-primary mt-10 w-full"
        onClick={finish}
        disabled={saving || elapsed === 0}
      >
        {saving ? "Salvando..." : "Concluir sessão"}
      </button>
    </div>
  );
}
