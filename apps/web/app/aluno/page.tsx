import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { planValidityLabel } from "@ptapp/shared";

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default async function AlunoHomePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user!.id)
    .single();

  const { data: plans } = await supabase
    .from("workout_plans")
    .select("*, workout_plan_exercises(id)")
    .eq("student_id", user!.id)
    .eq("active", true)
    .order("order_index");

  const weekStart = startOfWeek(new Date()).toISOString();
  const { data: logs } = await supabase
    .from("workout_logs")
    .select("workout_plan_id, completed_at")
    .eq("student_id", user!.id)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(100);

  const completedThisWeek = new Set(
    (logs ?? [])
      .filter((l) => l.completed_at && l.completed_at >= weekStart)
      .map((l) => l.workout_plan_id)
  );

  const daysSinceLastWorkout =
    logs && logs.length > 0 && logs[0].completed_at
      ? Math.floor((Date.now() - new Date(logs[0].completed_at).getTime()) / (1000 * 60 * 60 * 24))
      : null;

  const planList = plans ?? [];
  const weeklyGoal = planList.length;
  const weeklyDone = planList.filter((p) => completedThisWeek.has(p.id)).length;
  const nextPlan = planList.find((p) => !completedThisWeek.has(p.id)) ?? planList[0];
  const showReminder = daysSinceLastWorkout !== null && daysSinceLastWorkout >= 3;

  return (
    <div>
      <h1 className="text-xl font-semibold text-base-100">
        Olá, {profile?.full_name?.split(" ")[0] ?? "aluno"} 👋
      </h1>

      {showReminder ? (
        <div className="mt-4 rounded-2xl bg-volt p-4">
          <p className="text-sm font-semibold text-base-950">
            {daysSinceLastWorkout === 0
              ? "Você ainda não treinou hoje. Bora treinar!"
              : `Já fazem ${daysSinceLastWorkout} dias sem treino. Bora voltar!`}
          </p>
        </div>
      ) : null}

      {weeklyGoal > 0 ? (
        <div className="card mt-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-base-100">Treinos da semana</p>
            <p className="text-sm font-bold text-volt">
              {weeklyDone}/{weeklyGoal}
            </p>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-base-700">
            <div
              className="h-full rounded-full bg-volt"
              style={{ width: `${weeklyGoal ? (weeklyDone / weeklyGoal) * 100 : 0}%` }}
            />
          </div>
        </div>
      ) : null}

      {nextPlan ? (
        <Link
          href={`/aluno/treino/${nextPlan.id}`}
          className="mt-4 flex flex-col items-center rounded-2xl border border-volt p-5 text-center transition hover:bg-volt/5"
        >
          <p className="text-xs text-base-400">Próximo treino</p>
          <p className="mt-1 text-lg font-bold text-base-100">{nextPlan.name}</p>
          <span className="mt-3 rounded-full bg-volt px-5 py-2 text-xs font-bold text-base-950">
            Ir para o treino
          </span>
        </Link>
      ) : null}

      <p className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-base-400">
        Suas fichas
      </p>

      <div className="space-y-3">
        {planList.length === 0 ? (
          <div className="card text-center text-sm text-base-400">
            Você ainda não tem treinos cadastrados. Fale com seu personal.
          </div>
        ) : (
          planList.map((plan) => {
            const validity = planValidityLabel(plan.valid_until);
            return (
              <Link
                key={plan.id}
                href={`/aluno/treino/${plan.id}`}
                className="card flex items-center justify-between transition hover:border-base-400"
              >
                <div>
                  <p className="text-sm font-semibold text-base-100">{plan.name}</p>
                  <p className="mt-0.5 text-xs text-base-400">
                    {plan.workout_plan_exercises?.length ?? 0} exercícios
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
