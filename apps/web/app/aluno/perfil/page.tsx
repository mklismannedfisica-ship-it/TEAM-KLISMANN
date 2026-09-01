import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "./sign-out-button";

export default async function AlunoPerfilPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single();

  return (
    <div className="flex flex-col items-center pt-6 text-center">
      <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-volt">
        <span className="text-2xl font-extrabold text-base-950">
          {profile?.full_name?.[0]?.toUpperCase() ?? "?"}
        </span>
      </div>
      <h1 className="mt-4 text-lg font-bold text-base-100">{profile?.full_name}</h1>
      <p className="mt-1 text-sm text-base-400">{user?.email}</p>

      {profile?.phone ? (
        <div className="card mt-6 flex w-full items-center justify-between">
          <span className="text-sm text-base-400">Telefone</span>
          <span className="text-sm font-semibold text-base-100">{profile.phone}</span>
        </div>
      ) : null}

      <SignOutButton />
    </div>
  );
}
