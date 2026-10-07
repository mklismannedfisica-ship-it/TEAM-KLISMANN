"use client";

import { useRef, useState, useTransition } from "react";
import { createStudentSchedule, deleteStudentSchedule } from "./actions";
import { WEEKDAY_LABELS, type StudentSchedule } from "@ptapp/shared";

export type ScheduleWithStudent = StudentSchedule & { student: { full_name: string } | null };

export function ScheduleForm({
  schedules,
  students,
}: {
  schedules: ScheduleWithStudent[];
  students: { id: string; full_name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function handleDelete(id: string) {
    startTransition(() => {
      void deleteStudentSchedule(id);
    });
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-base-100">Alunos fixos</h2>
        {!open ? (
          <button className="btn-secondary" onClick={() => setOpen(true)}>
            + Horário fixo
          </button>
        ) : null}
      </div>

      {schedules.length === 0 ? (
        <p className="mt-3 text-sm text-base-400">
          Nenhum horário fixo cadastrado. Defina o dia e a hora de cada aluno recorrente — a
          agenda é gerada automaticamente nas próximas semanas.
        </p>
      ) : (
        <div className="mt-4 space-y-2">
          {schedules.map((schedule) => (
            <div
              key={schedule.id}
              className="flex items-center justify-between rounded-lg border border-base-700 bg-base-800 px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-base-100">{schedule.student?.full_name}</p>
                <p className="text-xs text-base-400">
                  {WEEKDAY_LABELS[schedule.weekday]} · {schedule.start_time.slice(0, 5)} às{" "}
                  {schedule.end_time.slice(0, 5)}
                </p>
              </div>
              <button
                className="btn-ghost text-red-400"
                onClick={() => handleDelete(schedule.id)}
                disabled={pending}
              >
                Remover
              </button>
            </div>
          ))}
        </div>
      )}

      {open ? (
        <form
          ref={formRef}
          action={(formData) => {
            setError(null);
            const submit = async () => {
              try {
                await createStudentSchedule(formData);
                formRef.current?.reset();
                setOpen(false);
              } catch (e) {
                setError(e instanceof Error ? e.message : "Erro ao salvar.");
              }
            };
            startTransition(() => {
              void submit();
            });
          }}
          className="mt-4 space-y-4 border-t border-base-800 pt-4"
        >
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="label" htmlFor="student_id">
                Aluno
              </label>
              <select id="student_id" name="student_id" required className="input">
                <option value="">Selecione...</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="weekday">
                Dia da semana
              </label>
              <select id="weekday" name="weekday" required className="input">
                {Object.entries(WEEKDAY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="start_time">
                Início
              </label>
              <input id="start_time" name="start_time" type="time" required className="input" />
            </div>
            <div>
              <label className="label" htmlFor="end_time">
                Fim
              </label>
              <input id="end_time" name="end_time" type="time" required className="input" />
            </div>
          </div>

          {error ? <p className="text-sm text-red-400">{error}</p> : null}

          <div className="flex gap-3">
            <button type="submit" className="btn-primary" disabled={pending}>
              {pending ? "Salvando..." : "Salvar horário fixo"}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
              Cancelar
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
