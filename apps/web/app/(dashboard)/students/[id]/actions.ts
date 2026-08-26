"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireTrainer() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");
  return { supabase, trainerId: user.id };
}

export async function createWorkoutPlan(studentId: string, name: string) {
  const { supabase, trainerId } = await requireTrainer();
  if (!name.trim()) throw new Error("Dê um nome para a ficha (ex: Treino A).");

  const { error } = await supabase.from("workout_plans").insert({
    trainer_id: trainerId,
    student_id: studentId,
    name: name.trim(),
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/students/${studentId}`);
}

export async function deleteWorkoutPlan(planId: string, studentId: string) {
  const { supabase } = await requireTrainer();
  const { error } = await supabase.from("workout_plans").delete().eq("id", planId);
  if (error) throw new Error(error.message);
  revalidatePath(`/students/${studentId}`);
}

export async function togglePlanActive(planId: string, studentId: string, active: boolean) {
  const { supabase } = await requireTrainer();
  const { error } = await supabase.from("workout_plans").update({ active }).eq("id", planId);
  if (error) throw new Error(error.message);
  revalidatePath(`/students/${studentId}`);
}

export async function addExerciseToPlan(
  planId: string,
  studentId: string,
  data: {
    exercise_id: string;
    sets: number;
    reps: string;
    rest_seconds: number;
    load_kg: number | null;
    notes: string | null;
  }
) {
  const { supabase } = await requireTrainer();

  const { count } = await supabase
    .from("workout_plan_exercises")
    .select("*", { count: "exact", head: true })
    .eq("workout_plan_id", planId);

  const { error } = await supabase.from("workout_plan_exercises").insert({
    workout_plan_id: planId,
    exercise_id: data.exercise_id,
    order_index: count ?? 0,
    sets: data.sets,
    reps: data.reps,
    rest_seconds: data.rest_seconds,
    load_kg: data.load_kg,
    notes: data.notes,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/students/${studentId}`);
}

export async function removeExerciseFromPlan(planExerciseId: string, studentId: string) {
  const { supabase } = await requireTrainer();
  const { error } = await supabase
    .from("workout_plan_exercises")
    .delete()
    .eq("id", planExerciseId);
  if (error) throw new Error(error.message);
  revalidatePath(`/students/${studentId}`);
}
