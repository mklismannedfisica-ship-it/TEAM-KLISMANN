"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/aluno", label: "Treinos", icon: "▤", exact: true },
  { href: "/aluno/cardio", label: "Cardio", icon: "♥" },
  { href: "/aluno/reposicao", label: "Reposição", icon: "📅" },
  { href: "/aluno/progresso", label: "Progresso", icon: "◈" },
  { href: "/aluno/perfil", label: "Perfil", icon: "◉" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-base-800 bg-base-900/95 backdrop-blur">
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-2">
        {links.map((link) => {
          const active = link.exact
            ? pathname === link.href
            : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className="flex flex-1 flex-col items-center gap-1 py-2.5"
            >
              <span
                className={`text-lg leading-none ${active ? "text-volt" : "text-base-400"}`}
              >
                {link.icon}
              </span>
              <span
                className={`text-[11px] font-medium ${active ? "text-volt" : "text-base-400"}`}
              >
                {link.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
