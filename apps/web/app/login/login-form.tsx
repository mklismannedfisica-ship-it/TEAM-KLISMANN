"use client";

import { useFormState, useFormStatus } from "react-dom";
import { signIn } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? "Entrando..." : "Entrar"}
    </button>
  );
}

export function LoginForm() {
  const [state, formAction] = useFormState<{ error: string | null }, FormData>(signIn, {
    error: null,
  });

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="label" htmlFor="email">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="input"
          placeholder="voce@exemplo.com"
        />
      </div>
      <div>
        <label className="label" htmlFor="password">
          Senha
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="input"
          placeholder="••••••••"
        />
      </div>
      {state?.error ? (
        <p className="rounded-lg border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-400">
          {state.error}
        </p>
      ) : null}
      <SubmitButton />
    </form>
  );
}
