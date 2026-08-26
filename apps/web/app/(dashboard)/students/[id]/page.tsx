import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PlanBuilder } from "./plan-builder";

export default async function StudentDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: student } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", params.id)
    .eq("trainer_id", user!.id)
    .single();

  if (!student) notFound();

  const { data: exercises } = await supabase
    .from("exercises")
    .select("*")
    .eq("trainer_id", user!.id)
    .order("name");

  const { data: plans } = await supabase
    .from("workout_plans")
    .select("*, workout_plan_exercises(*, exercise:exercises(*))")
    .eq("student_id", student.id)
    .order("order_index");

  return (
    <div>
      <Link href="/students" className="text-sm text-base-400 hover:text-base-100">
        ← Alunos
      </Link>
      <div className="mt-2 mb-6">
        <h1 className="text-2xl font-semibold text-base-100">{student.full_name}</h1>
        {student.phone ? <p className="mt-1 text-sm text-base-400">{student.phone}</p> : null}
      </div>

      {exercises && exercises.length === 0 ? (
        <div className="card mb-6 border-volt/30 text-sm text-base-400">
          Você ainda não tem exercícios cadastrados.{" "}
          <Link href="/exercises" className="text-volt hover:underline">
            Cadastre alguns primeiro
          </Link>{" "}
          para poder montar a ficha de treino.
        </div>
      ) : null}

      <PlanBuilder studentId={student.id} plans={plans ?? []} exercises={exercises ?? []} />
    </div>
  );
}
