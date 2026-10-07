import { createClient } from "@/lib/supabase/server";
import { formatDateLabel, formatTimeLabel } from "@ptapp/shared";
import { MessageList, type SessionForMessage } from "./message-list";

export default async function MensagensPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const { data: sessions } = await supabase
    .from("class_sessions")
    .select(
      "id, date, start_time, end_time, confirmation_sent, feedback_sent, student:profiles!class_sessions_student_id_fkey(full_name, phone)"
    )
    .eq("trainer_id", user.id)
    .eq("status", "scheduled")
    .gte("date", yesterday.toISOString().slice(0, 10))
    .lte("date", tomorrow.toISOString().slice(0, 10))
    .order("date")
    .order("start_time");

  const all = (sessions as SessionForMessage[] | null) ?? [];

  const pendingConfirmations = all.filter((session) => {
    const startsAt = new Date(`${session.date}T${session.start_time}`);
    return (
      !session.confirmation_sent &&
      startsAt > now &&
      startsAt.getTime() - now.getTime() <= 36 * 60 * 60 * 1000
    );
  });

  const pendingFeedback = all.filter((session) => {
    const startsAt = new Date(`${session.date}T${session.start_time}`);
    return !session.feedback_sent && startsAt <= now;
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-base-100">Mensagens</h1>
      <p className="mt-1 text-sm text-base-400">
        Textos prontos pra você mandar pelo seu WhatsApp. Clique em &quot;Abrir WhatsApp&quot;, o
        texto já vem preenchido — você só confirma o envio.
      </p>

      <div className="mt-8 space-y-8">
        <MessageList
          title="Confirmar treino de amanhã"
          description="Treinos nas próximas 36 horas que ainda não receberam confirmação."
          sessions={pendingConfirmations}
          onSent="confirmation"
          emptyLabel="Nenhuma confirmação pendente."
          buildMessage={(session) =>
            `Oi ${session.student?.full_name?.split(" ")[0] ?? ""}! Confirmando seu treino ${formatDateLabel(
              session.date
            ).toLowerCase()} às ${formatTimeLabel(session.start_time)}. Te espero!`
          }
        />

        <MessageList
          title="Feedback pós-treino"
          description="Treinos que já aconteceram e ainda não receberam mensagem de feedback."
          sessions={pendingFeedback}
          onSent="feedback"
          emptyLabel="Nenhum feedback pendente."
          buildMessage={(session) =>
            `Oi ${session.student?.full_name?.split(" ")[0] ?? ""}! Como foi o treino de ${formatDateLabel(
              session.date
            ).toLowerCase()}? Conta pra mim como você se sentiu.`
          }
        />
      </div>
    </div>
  );
}
