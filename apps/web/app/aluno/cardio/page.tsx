import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CARDIO_ACTIVITY_LABELS, CARDIO_INTENSITY_LABELS, planValidityLabel } from "@ptapp/shared";

export default async function AlunoCardioPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: sessions } = await supabase
    .from("cardio_sessions")
    .select("*")
    .eq("student_id", user!.id)
    .eq("active", true)
    .order("order_index");

  const list = sessions ?? [];

  return (
    <div>
      <h1 className="text-xl font-semibold text-base-100">Cardio</h1>
      <p className="mt-1 text-sm text-base-400">Sessões prescritas pelo seu personal</p>

      <div className="mt-5 space-y-3">
        {list.length === 0 ? (
          <div className="card text-center text-sm text-base-400">
            Nenhuma sessão de cardio cadastrada ainda. Fale com seu personal.
          </div>
        ) : (
          list.map((session) => {
            const validity = planValidityLabel(session.valid_until);
            return (
              <Link
                key={session.id}
                href={`/aluno/cardio/${session.id}`}
                className="card flex items-center justify-between transition hover:border-base-400"
              >
                <div>
                  <p className="text-sm font-semibold text-base-100">{session.name}</p>
                  <p className="mt-0.5 text-xs text-base-400">
                    {CARDIO_ACTIVITY_LABELS[session.activity]} ·{" "}
                    {CARDIO_INTENSITY_LABELS[session.intensity]} · {session.duration_minutes}min
                  </p>
                  {validity ? (
                    <p
                      className={`mt-1 text-xs font-medium ${
                        validity.status === "expired"
                          ? "text-red-400"
                          : validity.status === "soon"
                            ? "text-amber-400"
                            : "text-base-400"
                      }`}
                    >
                      {validity.label}
                    </p>
                  ) : null}
                </div>
                <span className="text-xl text-base-400">›</span>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
