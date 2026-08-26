import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SidebarNav } from "./sidebar-nav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "trainer") {
    await supabase.auth.signOut();
    redirect("/login?error=area-exclusiva-personal");
  }

  return (
    <div className="flex min-h-screen">
      <SidebarNav trainerName={profile.full_name} />
      <main className="flex-1 px-6 py-8 md:px-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
