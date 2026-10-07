import { createClient } from "@/lib/supabase/server";
import { ScheduleForm, type ScheduleWithStudent } from "./schedule-form";
import { SessionList, type SessionWithStudent } from "./session-list";
import { RequestsList, type RequestWithStudent } from "./requests-list";
import { GoogleCalendarCard } from "./google-calendar-card";
import { isGoogleCalendarConfigured, syncPendingSessions } from "@/lib/google-calendar";

export default async function AgendaPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  await supabase.rpc("ensure_class_sessions", { p_trainer_id: user.id, p_days: 28 });
  await syncPendingSessions(supabase, user.id);

  const today = new Date().toISOString().slice(0, 10);

  const [{ data: students }, { data: schedules }, { data: sessions }, { data: requests }, { data: googleAccount }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name")
        .eq("trainer_id", user.id)
        .order("full_name"),
      supabase
        .from("student_schedules")
        .select("*, student:profiles!student_schedules_student_id_fkey(full_name)")
        .eq("trainer_id", user.id)
        .order("weekday")
        .order("start_time"),
      supabase
        .from("class_sessions")
        .select("*, student:profiles!class_sessions_student_id_fkey(full_name)")
        .eq("trainer_id", user.id)
        .eq("status", "scheduled")
        .gte("date", today)
        .order("date")
        .order("start_time"),
      supabase
        .from("reschedule_requests")
        .select("*, student:profiles!reschedule_requests_student_id_fkey(full_name)")
        .eq("trainer_id", user.id)
        .eq("status", "pending")
        .order("created_at"),
      supabase.from("google_accounts").select("trainer_id").eq("trainer_id", user.id).maybeSingle(),
    ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-base-100">Agenda</h1>
      <p className="mt-1 text-sm text-base-400">
        Você controla os horários. Pedidos de troca dos alunos aparecem aqui pra você decidir.
      </p>

      <div className="mt-8 space-y-8">
        <GoogleCalendarCard
          connected={Boolean(googleAccount)}
          configured={isGoogleCalendarConfigured()}
        />

        <RequestsList requests={(requests as RequestWithStudent[] | null) ?? []} />

        <ScheduleForm
          schedules={(schedules as ScheduleWithStudent[] | null) ?? []}
          students={students ?? []}
        />

        <div className="card">
          <SessionList
            sessions={(sessions as SessionWithStudent[] | null) ?? []}
            students={students ?? []}
          />
        </div>
      </div>
    </div>
  );
}
