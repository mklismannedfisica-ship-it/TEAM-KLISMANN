import { createClient } from "@/lib/supabase/server";
import { RequestForm } from "./request-form";
import { formatDateLabel, formatTimeLabel } from "@ptapp/shared";

const REQUEST_STATUS_LABELS: Record<string, string> = {
  pending: "Aguardando resposta",
  approved: "Aprovado",
  declined: "Recusado",
};

export default async function AlunoAgendaPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const today = new Date().toISOString().slice(0, 10);

  const [{ data: sessions }, { data: requests }] = await Promise.all([
    supabase
      .from("class_sessions")
      .select("*")
      .eq("student_id", user.id)
      .eq("status", "scheduled")
      .gte("date", today)
      .order("date")
      .order("start_time"),
    supabase
      .from("reschedule_requests")
      .select("*")
      .eq("student_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-base-100">Minha agenda</h1>
      <p className="mt-1 text-sm text-base-400">
        Seus próximos treinos. Precisa de outro horário? Peça abaixo — seu personal decide.
      </p>

      <div className="mt-6 card">
        <h2 className="text-base font-semibold text-base-100">Próximos treinos</h2>
        {sessions && sessions.length > 0 ? (
          <div className="mt-4 space-y-2">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="rounded-lg border border-base-700 bg-base-800 px-4 py-3"
              >
                <p className="text-sm font-medium text-base-100">
                  {formatDateLabel(session.date)} · {formatTimeLabel(session.start_time)} às{" "}
                  {formatTimeLabel(session.end_time)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-base-400">Nenhum treino agendado ainda.</p>
        )}

        <div className="mt-4">
          <RequestForm sessions={sessions ?? []} />
        </div>
      </div>

      {requests && requests.length > 0 ? (
        <div className="mt-6 card">
          <h2 className="text-base font-semibold text-base-100">Meus pedidos</h2>
          <div className="mt-4 space-y-2">
            {requests.map((request) => (
              <div
                key={request.id}
                className="rounded-lg border border-base-700 bg-base-800 px-4 py-3"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-base-100">
                    {formatDateLabel(request.requested_date)} ·{" "}
                    {formatTimeLabel(request.requested_start_time)}
                  </p>
                  <span
                    className={`badge ${
                      request.status === "approved"
                        ? "border-volt/40 text-volt"
                        : request.status === "declined"
                          ? "border-red-900 bg-red-950/50 text-red-400"
                          : ""
                    }`}
                  >
                    {REQUEST_STATUS_LABELS[request.status]}
                  </span>
                </div>
                {request.trainer_note ? (
                  <p className="mt-1 text-xs text-base-400">{request.trainer_note}</p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
