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

  if (!profile) {
    await supabase.auth.signOut();
    redirect("/login");
  }

  if (profile.role !== "trainer") {
    redirect("/aluno");
  }

  const { data: notifications } = await supabase
    .from("trainer_notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="flex min-h-screen">
      <SidebarNav trainerName={profile.full_name} notifications={notifications ?? []} />
      <main className="flex-1 px-6 py-8 md:px-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
