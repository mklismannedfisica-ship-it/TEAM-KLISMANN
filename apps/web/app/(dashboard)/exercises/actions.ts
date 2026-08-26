"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { MuscleGroup } from "@ptapp/shared";

export async function createExercise(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  const name = String(formData.get("name") ?? "").trim();
  const muscle_group = String(formData.get("muscle_group") ?? "") as MuscleGroup;
  const equipment = String(formData.get("equipment") ?? "").trim() || null;
  const video_url = String(formData.get("video_url") ?? "").trim() || null;
  const instructions = String(formData.get("instructions") ?? "").trim() || null;

  if (!name || !muscle_group) throw new Error("Nome e grupo muscular são obrigatórios.");

  const { error } = await supabase.from("exercises").insert({
    trainer_id: user.id,
    name,
    muscle_group,
    equipment,
    video_url,
    instructions,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/exercises");
}

export async function deleteExercise(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("exercises").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/exercises");
}
