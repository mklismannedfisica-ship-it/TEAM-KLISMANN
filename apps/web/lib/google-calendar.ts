import "server-only";
import { google } from "googleapis";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@ptapp/shared";

function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

export function isGoogleCalendarConfigured() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REDIRECT_URI
  );
}

export function getGoogleAuthUrl() {
  return getOAuthClient().generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/calendar.events"],
  });
}

export async function exchangeGoogleCode(code: string) {
  const { tokens } = await getOAuthClient().getToken(code);
  if (!tokens.refresh_token) {
    throw new Error(
      "O Google não devolveu um refresh token. Remova o acesso do app em myaccount.google.com/permissions e conecte de novo."
    );
  }
  return tokens.refresh_token;
}

type SessionForSync = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  google_event_id: string | null;
};

/**
 * Cria ou atualiza o evento no Google Calendar do personal. Nunca lança erro:
 * a sincronização é um extra, não pode travar a agenda se o Google falhar.
 */
export async function syncSessionToGoogle(
  supabase: SupabaseClient<Database>,
  trainerId: string,
  session: SessionForSync,
  studentName: string
): Promise<void> {
  try {
    const { data: account } = await supabase
      .from("google_accounts")
      .select("refresh_token, calendar_id")
      .eq("trainer_id", trainerId)
      .single();
    if (!account) return;

    const oauth2Client = getOAuthClient();
    oauth2Client.setCredentials({ refresh_token: account.refresh_token });
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const eventBody = {
      summary: `Treino - ${studentName}`,
      start: { dateTime: `${session.date}T${session.start_time}`, timeZone: "America/Sao_Paulo" },
      end: { dateTime: `${session.date}T${session.end_time}`, timeZone: "America/Sao_Paulo" },
    };

    if (session.google_event_id) {
      await calendar.events.update({
        calendarId: account.calendar_id,
        eventId: session.google_event_id,
        requestBody: eventBody,
      });
    } else {
      const { data: event } = await calendar.events.insert({
        calendarId: account.calendar_id,
        requestBody: eventBody,
      });
      if (event.id) {
        await supabase.from("class_sessions").update({ google_event_id: event.id }).eq("id", session.id);
      }
    }
  } catch (error) {
    console.error("Falha ao sincronizar com o Google Calendar:", error);
  }
}

/**
 * Sincroniza sessões que ainda não têm evento no Google (ex: geradas
 * automaticamente a partir de um horário fixo). Chamada ao abrir a agenda.
 */
export async function syncPendingSessions(supabase: SupabaseClient<Database>, trainerId: string) {
  const { data: account } = await supabase
    .from("google_accounts")
    .select("trainer_id")
    .eq("trainer_id", trainerId)
    .single();
  if (!account) return;

  const { data: sessions } = await supabase
    .from("class_sessions")
    .select("id, date, start_time, end_time, google_event_id, student:profiles!class_sessions_student_id_fkey(full_name)")
    .eq("trainer_id", trainerId)
    .eq("status", "scheduled")
    .is("google_event_id", null)
    .limit(50);

  const list = (sessions ?? []) as unknown as (SessionForSync & {
    student: { full_name: string } | null;
  })[];

  for (const session of list) {
    await syncSessionToGoogle(supabase, trainerId, session, session.student?.full_name ?? "aluno");
  }
}

export async function deleteSessionFromGoogle(
  supabase: SupabaseClient<Database>,
  trainerId: string,
  session: SessionForSync
): Promise<void> {
  if (!session.google_event_id) return;
  try {
    const { data: account } = await supabase
      .from("google_accounts")
      .select("refresh_token, calendar_id")
      .eq("trainer_id", trainerId)
      .single();
    if (!account) return;

    const oauth2Client = getOAuthClient();
    oauth2Client.setCredentials({ refresh_token: account.refresh_token });
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    await calendar.events.delete({ calendarId: account.calendar_id, eventId: session.google_event_id });
  } catch (error) {
    console.error("Falha ao remover evento do Google Calendar:", error);
  }
}
