"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { deleteSessionFromGoogle, syncSessionToGoogle } from "@/lib/google-calendar";

type SessionWithStudentName = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  google_event_id: string | null;
  student: { full_name: string } | null;
};

export async function createStudentSchedule(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  const student_id = String(formData.get("student_id") ?? "");
  const weekday = Number(formData.get("weekday"));
  const start_time = String(formData.get("start_time") ?? "");
  const end_time = String(formData.get("end_time") ?? "");

  if (!student_id || Number.isNaN(weekday) || !start_time || !end_time) {
    throw new Error("Preencha aluno, dia, início e fim do horário.");
  }
  if (start_time >= end_time) {
    throw new Error("O horário de início precisa ser antes do fim.");
  }

  const { error } = await supabase.from("student_schedules").insert({
    trainer_id: user.id,
    student_id,
    weekday,
    start_time,
    end_time,
  });

  if (error) throw new Error(error.message);

  await supabase.rpc("ensure_class_sessions", { p_trainer_id: user.id, p_days: 28 });

  revalidatePath("/agenda");
}

export async function deleteStudentSchedule(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("student_schedules").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/agenda");
}

export async function createSession(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  const student_id = String(formData.get("student_id") ?? "");
  const date = String(formData.get("date") ?? "");
  const start_time = String(formData.get("start_time") ?? "");
  const end_time = String(formData.get("end_time") ?? "");

  if (!student_id || !date || !start_time || !end_time) {
    throw new Error("Preencha aluno, data, início e fim.");
  }
  if (start_time >= end_time) {
    throw new Error("O horário de início precisa ser antes do fim.");
  }

  const { data, error } = await supabase
    .from("class_sessions")
    .insert({ trainer_id: user.id, student_id, date, start_time, end_time })
    .select("id, date, start_time, end_time, google_event_id, student:profiles!class_sessions_student_id_fkey(full_name)")
    .single();

  if (error) throw new Error(error.message);

  const session = data as unknown as SessionWithStudentName | null;
  if (session) {
    await syncSessionToGoogle(supabase, user.id, session, session.student?.full_name ?? "aluno");
  }

  revalidatePath("/agenda");
}

export async function moveSession(id: string, formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  const date = String(formData.get("date") ?? "");
  const start_time = String(formData.get("start_time") ?? "");
  const end_time = String(formData.get("end_time") ?? "");

  if (!date || !start_time || !end_time) throw new Error("Preencha data, início e fim.");
  if (start_time >= end_time) throw new Error("O horário de início precisa ser antes do fim.");

  const { data, error } = await supabase
    .from("class_sessions")
    .update({ date, start_time, end_time })
    .eq("id", id)
    .select("id, date, start_time, end_time, google_event_id, student:profiles!class_sessions_student_id_fkey(full_name)")
    .single();

  if (error) throw new Error(error.message);

  const session = data as unknown as SessionWithStudentName | null;
  if (session) {
    await syncSessionToGoogle(supabase, user.id, session, session.student?.full_name ?? "aluno");
  }

  revalidatePath("/agenda");
}

export async function cancelSession(id: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  const { data: session, error } = await supabase
    .from("class_sessions")
    .update({ status: "canceled" })
    .eq("id", id)
    .select("id, date, start_time, end_time, google_event_id")
    .single();

  if (error) throw new Error(error.message);

  if (session) {
    await deleteSessionFromGoogle(supabase, user.id, session);
  }

  revalidatePath("/agenda");
}

export async function resolveRequest(
  id: string,
  decision: "approved" | "declined",
  trainerNote: string | null
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  const { data: request, error: fetchError } = await supabase
    .from("reschedule_requests")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !request) throw new Error("Pedido não encontrado.");

  if (decision === "approved") {
    if (request.session_id) {
      const { data, error } = await supabase
        .from("class_sessions")
        .update({
          date: request.requested_date,
          start_time: request.requested_start_time,
          end_time: request.requested_end_time,
        })
        .eq("id", request.session_id)
        .select(
          "id, date, start_time, end_time, google_event_id, student:profiles!class_sessions_student_id_fkey(full_name)"
        )
        .single();
      if (error) throw new Error(error.message);
      const session = data as unknown as SessionWithStudentName | null;
      if (session) {
        await syncSessionToGoogle(supabase, user.id, session, session.student?.full_name ?? "aluno");
      }
    } else {
      const { data, error } = await supabase
        .from("class_sessions")
        .insert({
          trainer_id: user.id,
          student_id: request.student_id,
          date: request.requested_date,
          start_time: request.requested_start_time,
          end_time: request.requested_end_time,
        })
        .select(
          "id, date, start_time, end_time, google_event_id, student:profiles!class_sessions_student_id_fkey(full_name)"
        )
        .single();
      if (error) throw new Error(error.message);
      const session = data as unknown as SessionWithStudentName | null;
      if (session) {
        await syncSessionToGoogle(supabase, user.id, session, session.student?.full_name ?? "aluno");
      }
    }
  }

  const { error } = await supabase
    .from("reschedule_requests")
    .update({ status: decision, trainer_note: trainerNote, resolved_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/agenda");
}

export async function disconnectGoogleCalendar() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  const { error } = await supabase.from("google_accounts").delete().eq("trainer_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/agenda");
}
