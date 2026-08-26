import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ count: studentCount }, { count: exerciseCount }, { count: planCount }] =
    await Promise.all([
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
    ]);

  const stats = [
    { label: "Alunos ativos", value: studentCount ?? 0, href: "/students" },
    { label: "Exercícios na biblioteca", value: exerciseCount ?? 0, href: "/exercises" },
    { label: "Fichas de treino ativas", value: planCount ?? 0, href: "/students" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-base-100">Visão geral</h1>
      <p className="mt-1 text-sm text-base-400">
        Acompanhe sua consultoria em um só lugar.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} className="card transition hover:border-base-400">
            <p className="text-3xl font-semibold text-volt">{stat.value}</p>
            <p className="mt-1 text-sm text-base-400">{stat.label}</p>
          </Link>
        ))}
      </div>

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
