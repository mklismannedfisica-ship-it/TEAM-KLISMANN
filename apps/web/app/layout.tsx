import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Painel do Personal",
  description: "Gerencie alunos, exercícios e treinos da sua consultoria online.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <body>{children}</body>
    </html>
  );
}
