"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    if (!confirm("Deseja sair da sua conta?")) return;
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      className="mt-8 rounded-full border border-red-900 px-8 py-3 text-sm font-semibold text-red-400"
    >
      Sair da conta
    </button>
  );
}
