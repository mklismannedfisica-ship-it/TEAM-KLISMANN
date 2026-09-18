"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function bookSlot(slotId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  const { error } = await supabase
    .from("class_bookings")
    .insert({ slot_id: slotId, student_id: user.id });

  if (error) {
    if (error.code === "23505") throw new Error("Você já marcou essa vaga.");
    throw new Error(error.message);
  }
  revalidatePath("/aluno/reposicao");
}

export async function cancelBooking(bookingId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  const { error } = await supabase
    .from("class_bookings")
    .update({ status: "canceled", canceled_by: user.id, canceled_at: new Date().toISOString() })
    .eq("id", bookingId);

  if (error) throw new Error(error.message);
  revalidatePath("/aluno/reposicao");
}
