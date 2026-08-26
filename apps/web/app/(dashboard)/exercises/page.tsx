import { createClient } from "@/lib/supabase/server";
import { ExerciseForm } from "./exercise-form";
import { ExerciseList } from "./exercise-list";

export default async function ExercisesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: exercises } = await supabase
    .from("exercises")
    .select("*")
    .eq("trainer_id", user!.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-base-100">Biblioteca de exercícios</h1>
          <p className="mt-1 text-sm text-base-400">
            Cadastre os exercícios que você usa para montar os treinos.
          </p>
        </div>
      </div>
      <div className="mb-6">
        <ExerciseForm />
      </div>
      <ExerciseList exercises={exercises ?? []} />
    </div>
  );
}
