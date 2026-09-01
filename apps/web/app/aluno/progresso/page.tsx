import { createClient } from "@/lib/supabase/server";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function AlunoProgressoPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: logs } = await supabase
    .from("workout_logs")
    .select("id, completed_at, workout_plans(name)")
    .eq("student_id", user!.id)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(50);

  const list = (logs ?? []) as unknown as {
    id: string;
    completed_at: string | null;
    workout_plans: { name: string } | null;
  }[];

  return (
    <div>
      <h1 className="text-xl font-semibold text-base-100">Progresso</h1>

      <div className="card mt-4 text-center">
        <p className="text-3xl font-extrabold text-volt">{list.length}</p>
        <p className="mt-1 text-sm text-base-400">treinos concluídos</p>
      </div>

      <div className="mt-5 space-y-2.5">
        {list.length === 0 ? (
          <div className="card text-center text-sm text-base-400">
            Nenhum treino concluído ainda. Vá na aba Treinos e comece o de hoje.
          </div>
        ) : (
          list.map((log) => (
            <div key={log.id} className="card flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-base-100">
                  {log.workout_plans?.name ?? "Treino"}
                </p>
                <p className="mt-0.5 text-xs text-base-400">
                  {log.completed_at ? formatDate(log.completed_at) : ""}
                </p>
              </div>
              <span className="font-bold text-volt">✓</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
