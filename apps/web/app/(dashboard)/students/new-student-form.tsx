"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function NewStudentForm() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<{
    email: string;
    full_name: string;
    temp_password: string;
  } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: formData.get("full_name"),
          email: formData.get("email"),
          phone: formData.get("phone"),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erro ao cadastrar aluno.");

      setCredentials({
        email: json.student.email,
        full_name: json.student.full_name,
        temp_password: json.temp_password,
      });
      formRef.current?.reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao cadastrar aluno.");
    } finally {
      setPending(false);
    }
  }

  if (credentials) {
    return (
      <div className="card mb-6 border-volt/40">
        <h3 className="font-semibold text-base-100">Aluno cadastrado!</h3>
        <p className="mt-1 text-sm text-base-400">
          Envie estes dados de acesso para {credentials.full_name} — peça para trocar a senha no
          primeiro acesso ao app.
        </p>
        <div className="mt-4 space-y-2 rounded-lg border border-base-700 bg-base-800 p-4 font-mono text-sm">
          <p>
            <span className="text-base-400">E-mail:</span> {credentials.email}
          </p>
          <p>
            <span className="text-base-400">Senha provisória:</span> {credentials.temp_password}
          </p>
        </div>
        <button
          className="btn-secondary mt-4"
          onClick={() => {
            setCredentials(null);
            setOpen(false);
          }}
        >
          Fechar
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <button className="btn-primary" onClick={() => setOpen(true)}>
        + Novo aluno
      </button>
    );
  }

  return (
    <div className="card mb-6">
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="full_name">
              Nome completo
            </label>
            <input id="full_name" name="full_name" required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="email">
              E-mail
            </label>
            <input id="email" name="email" type="email" required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="phone">
              Telefone (opcional)
            </label>
            <input id="phone" name="phone" className="input" />
          </div>
        </div>

        {error ? <p className="text-sm text-red-400">{error}</p> : null}

        <div className="flex gap-3">
          <button type="submit" className="btn-primary" disabled={pending}>
            {pending ? "Cadastrando..." : "Cadastrar aluno"}
          </button>
          <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
