"use client";

import { useRef, useState, useTransition } from "react";
import { createRule, deleteRule } from "./actions";
import { WEEKDAY_LABELS, type AvailabilityRule } from "@ptapp/shared";

export function RuleForm({ rules }: { rules: AvailabilityRule[] }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function handleDelete(id: string) {
    startTransition(() => {
      void deleteRule(id);
    });
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-base-100">Horários fixos de reposição</h2>
        {!open ? (
          <button className="btn-secondary" onClick={() => setOpen(true)}>
            + Novo horário
          </button>
        ) : null}
      </div>

      {rules.length === 0 ? (
        <p className="mt-3 text-sm text-base-400">
          Nenhum horário cadastrado ainda. Cadastre os dias e horas em que você abre vaga para
          reposição — o sistema gera as vagas das próximas semanas automaticamente.
        </p>
      ) : (
        <div className="mt-4 space-y-2">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="flex items-center justify-between rounded-lg border border-base-700 bg-base-800 px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-base-100">
                  {WEEKDAY_LABELS[rule.weekday]} · {rule.start_time.slice(0, 5)} às{" "}
                  {rule.end_time.slice(0, 5)}
                </p>
                <p className="text-xs text-base-400">
                  {rule.capacity} {rule.capacity === 1 ? "vaga" : "vagas"} por horário
                </p>
              </div>
              <button
                className="btn-ghost text-red-400"
                onClick={() => handleDelete(rule.id)}
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
                await createRule(formData);
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
            <div>
              <label className="label" htmlFor="capacity">
                Vagas
              </label>
              <input
                id="capacity"
                name="capacity"
                type="number"
                min={1}
                defaultValue={1}
                required
                className="input"
              />
            </div>
          </div>

          {error ? <p className="text-sm text-red-400">{error}</p> : null}

          <div className="flex gap-3">
            <button type="submit" className="btn-primary" disabled={pending}>
              {pending ? "Salvando..." : "Salvar horário"}
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
