"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function requestReschedule(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("trainer_id")
    .eq("id", user.id)
    .single();
  if (!profile?.trainer_id) throw new Error("Seu personal ainda não está vinculado à sua conta.");

  const session_id = String(formData.get("session_id") ?? "") || null;
  const requested_date = String(formData.get("requested_date") ?? "");
  const requested_start_time = String(formData.get("requested_start_time") ?? "");
  const requested_end_time = String(formData.get("requested_end_time") ?? "");
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!requested_date || !requested_start_time || !requested_end_time) {
    throw new Error("Preencha data, início e fim do horário desejado.");
  }
  if (requested_start_time >= requested_end_time) {
    throw new Error("O horário de início precisa ser antes do fim.");
  }

  const { error } = await supabase.from("reschedule_requests").insert({
    trainer_id: profile.trainer_id,
    student_id: user.id,
    session_id,
    requested_date,
    requested_start_time,
    requested_end_time,
    note,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/aluno/agenda");
}
