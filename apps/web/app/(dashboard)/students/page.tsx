import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { NewStudentForm } from "./new-student-form";

export default async function StudentsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: students } = await supabase
    .from("profiles")
    .select("*")
    .eq("trainer_id", user!.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-base-100">Alunos</h1>
        <p className="mt-1 text-sm text-base-400">
          Cadastre alunos e monte a ficha de treino de cada um.
        </p>
      </div>

      <div className="mb-6">
        <NewStudentForm />
      </div>

      {students && students.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {students.map((student) => (
            <Link key={student.id} href={`/students/${student.id}`} className="card transition hover:border-base-400">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-base-100">{student.full_name}</h3>
                <span
                  className={`badge ${student.active ? "border-volt/40 text-volt" : "text-base-400"}`}
                >
                  {student.active ? "Ativo" : "Inativo"}
                </span>
              </div>
              {student.phone ? <p className="mt-1 text-xs text-base-400">{student.phone}</p> : null}
            </Link>
          ))}
        </div>
      ) : (
        <div className="card text-center text-sm text-base-400">
          Nenhum aluno cadastrado ainda. Cadastre o primeiro acima.
        </div>
      )}
    </div>
  );
}
