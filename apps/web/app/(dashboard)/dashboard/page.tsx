import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { planValidityLabel, formatTimeLabel } from "@ptapp/shared";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const in7Days = new Date(today);
  in7Days.setDate(in7Days.getDate() + 7);
  const in7DaysStr = in7Days.toISOString().slice(0, 10);

  const [
    { count: studentCount },
    { count: exerciseCount },
    { count: planCount },
    { data: expiringPlans },
    { data: todaySessions },
  ] = await Promise.all([
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("trainer_id", user!.id),
      supabase
        .from("exercises")
        .select("*", { count: "exact", head: true })
        .eq("trainer_id", user!.id),
      supabase
        .from("workout_plans")
        .select("*", { count: "exact", head: true })
        .eq("trainer_id", user!.id)
        .eq("active", true),
      supabase
        .from("workout_plans")
        .select("id, name, valid_until, student:profiles!workout_plans_student_id_fkey(id, full_name)")
        .eq("trainer_id", user!.id)
        .eq("active", true)
        .lte("valid_until", in7DaysStr)
        .not("valid_until", "is", null)
        .order("valid_until"),
      supabase
        .from("class_sessions")
        .select("id, start_time, end_time, student:profiles!class_sessions_student_id_fkey(full_name)")
        .eq("trainer_id", user!.id)
        .eq("date", todayStr)
        .eq("status", "scheduled")
        .order("start_time"),
    ]);

  const todayClasses = todaySessions ?? [];

  const stats = [
    { label: "Alunos ativos", value: studentCount ?? 0, href: "/students" },
    { label: "Exercícios na biblioteca", value: exerciseCount ?? 0, href: "/exercises" },
    { label: "Fichas de treino ativas", value: planCount ?? 0, href: "/students" },
    { label: "Fichas vencendo em 7 dias", value: expiringPlans?.length ?? 0, href: "#vencendo" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-base-100">Visão geral</h1>
      <p className="mt-1 text-sm text-base-400">
        Acompanhe sua consultoria em um só lugar.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} className="card transition hover:border-base-400">
            <p className="text-3xl font-semibold text-volt">{stat.value}</p>
            <p className="mt-1 text-sm text-base-400">{stat.label}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 card">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-base-100">Treinos de hoje</h2>
          <Link href="/agenda" className="text-xs font-medium text-volt">
            Ver agenda
          </Link>
        </div>
        {todayClasses.length === 0 ? (
          <p className="mt-3 text-sm text-base-400">Nenhum treino agendado para hoje.</p>
        ) : (
          <div className="mt-4 space-y-2">
            {todayClasses.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between rounded-lg border border-base-700 bg-base-800 px-4 py-3"
              >
                <p className="text-sm font-medium text-base-100">
                  {formatTimeLabel(session.start_time)} às {formatTimeLabel(session.end_time)}
                </p>
                <p className="text-xs text-base-400">{session.student?.full_name}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {expiringPlans && expiringPlans.length > 0 ? (
        <div id="vencendo" className="mt-8 card">
          <h2 className="text-base font-semibold text-base-100">Fichas vencendo</h2>
          <div className="mt-4 space-y-2">
            {expiringPlans.map((plan) => {
              const validity = planValidityLabel(plan.valid_until);
              return (
                <Link
                  key={plan.id}
                  href={`/students/${plan.student?.id}`}
                  className="flex items-center justify-between rounded-lg border border-base-700 bg-base-800 px-4 py-3 transition hover:border-base-400"
                >
                  <div>
                    <p className="text-sm font-medium text-base-100">{plan.student?.full_name}</p>
                    <p className="text-xs text-base-400">{plan.name}</p>
                  </div>
                  <span
                    className={`badge ${
                      validity?.status === "expired"
                        ? "border-red-900 bg-red-950/50 text-red-400"
                        : "border-amber-900 bg-amber-950/50 text-amber-400"
                    }`}
                  >
                    {validity?.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="mt-8 card">
        <h2 className="text-base font-semibold text-base-100">Primeiros passos</h2>
        <ol className="mt-4 space-y-3 text-sm text-base-400">
          <li className="flex gap-3">
            <span className="badge shrink-0">1</span>
            Cadastre os exercícios que você usa nos treinos, com vídeo de execução.
          </li>
          <li className="flex gap-3">
            <span className="badge shrink-0">2</span>
            Cadastre seus alunos — cada um recebe login e senha para o app.
          </li>
          <li className="flex gap-3">
            <span className="badge shrink-0">3</span>
            Monte a ficha de treino de cada aluno escolhendo exercícios, séries e cargas.
          </li>
          <li className="flex gap-3">
            <span className="badge shrink-0">4</span>
            Seu aluno abre o app no celular, treina e registra o progresso.
          </li>
        </ol>
      </div>
    </div>
  );
}
