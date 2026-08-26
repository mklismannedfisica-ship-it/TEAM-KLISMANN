"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { CardioActivity, CardioIntensity } from "@ptapp/shared";

async function requireTrainer() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");
  return { supabase, trainerId: user.id };
}

export async function createCardioSession(
  studentId: string,
  data: {
    name: string;
    activity: CardioActivity;
    intensity: CardioIntensity;
    duration_minutes: number;
    instructions: string | null;
    valid_until: string | null;
  }
) {
  const { supabase, trainerId } = await requireTrainer();
  if (!data.name.trim()) throw new Error("Dê um nome para a sessão de cardio.");

  const { count } = await supabase
    .from("cardio_sessions")
    .select("*", { count: "exact", head: true })
    .eq("student_id", studentId);

  const { error } = await supabase.from("cardio_sessions").insert({
    trainer_id: trainerId,
    student_id: studentId,
    name: data.name.trim(),
    activity: data.activity,
    intensity: data.intensity,
    duration_minutes: data.duration_minutes,
    instructions: data.instructions,
    valid_until: data.valid_until,
    order_index: count ?? 0,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/students/${studentId}`);
}

export async function deleteCardioSession(sessionId: string, studentId: string) {
  const { supabase } = await requireTrainer();
  const { error } = await supabase.from("cardio_sessions").delete().eq("id", sessionId);
  if (error) throw new Error(error.message);
  revalidatePath(`/students/${studentId}`);
}

export async function toggleCardioActive(sessionId: string, studentId: string, active: boolean) {
  const { supabase } = await requireTrainer();
  const { error } = await supabase.from("cardio_sessions").update({ active }).eq("id", sessionId);
  if (error) throw new Error(error.message);
  revalidatePath(`/students/${studentId}`);
}
