"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const links = [
  { href: "/dashboard", label: "Visão geral", icon: "▦" },
  { href: "/students", label: "Alunos", icon: "◉" },
  { href: "/exercises", label: "Exercícios", icon: "▤" },
];

export function SidebarNav({ trainerName }: { trainerName: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-base-800 bg-base-900/40 px-5 py-8 md:flex">
      <div className="mb-10 flex items-center gap-2 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-volt text-base font-black text-base-950">
          P
        </div>
        <span className="text-sm font-semibold text-base-100">Painel do Personal</span>
      </div>

      <nav className="flex-1 space-y-1">
        {links.map((link) => {
          const active = pathname === link.href || pathname.startsWith(link.href + "/");
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-volt/10 text-volt"
                  : "text-base-400 hover:bg-base-800 hover:text-base-100"
              }`}
            >
              <span className="text-base leading-none">{link.icon}</span>
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 border-t border-base-800 pt-4">
        <p className="truncate px-3 text-xs text-base-400">{trainerName}</p>
        <button onClick={handleSignOut} className="btn-ghost mt-1 w-full justify-start px-3">
          Sair
        </button>
      </div>
    </aside>
  );
}
