"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createRule(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  const weekday = Number(formData.get("weekday"));
  const start_time = String(formData.get("start_time") ?? "");
  const end_time = String(formData.get("end_time") ?? "");
  const capacity = Number(formData.get("capacity") ?? 1);

  if (Number.isNaN(weekday) || !start_time || !end_time) {
    throw new Error("Preencha dia, início e fim do horário.");
  }
  if (start_time >= end_time) {
    throw new Error("O horário de início precisa ser antes do fim.");
  }

  const { error } = await supabase.from("availability_rules").insert({
    trainer_id: user.id,
    weekday,
    start_time,
    end_time,
    capacity: capacity > 0 ? capacity : 1,
  });

  if (error) throw new Error(error.message);

  await supabase.rpc("ensure_class_slots", { p_trainer_id: user.id, p_days: 21 });

  revalidatePath("/agenda");
}

export async function deleteRule(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("availability_rules").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/agenda");
}

export async function cancelSlot(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("class_slots").update({ canceled: true }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/agenda");
}
