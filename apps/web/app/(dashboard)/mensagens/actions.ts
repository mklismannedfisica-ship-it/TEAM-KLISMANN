"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function markConfirmationSent(sessionId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("class_sessions")
    .update({ confirmation_sent: true })
    .eq("id", sessionId);
  if (error) throw new Error(error.message);
  revalidatePath("/mensagens");
}

export async function markFeedbackSent(sessionId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("class_sessions")
    .update({ feedback_sent: true })
    .eq("id", sessionId);
  if (error) throw new Error(error.message);
  revalidatePath("/mensagens");
}
