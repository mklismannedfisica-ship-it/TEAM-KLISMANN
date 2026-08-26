import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-volt text-xl font-black text-base-950">
            P
          </div>
          <h1 className="text-xl font-semibold text-base-100">Painel do Personal</h1>
          <p className="mt-1 text-sm text-base-400">Entre para gerenciar seus alunos e treinos.</p>
        </div>
        <div className="card">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
