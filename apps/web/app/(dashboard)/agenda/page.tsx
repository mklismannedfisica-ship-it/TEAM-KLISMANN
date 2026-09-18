import { createClient } from "@/lib/supabase/server";
import { RuleForm } from "./rule-form";
import { SlotList, type SlotWithBookings } from "./slot-list";

export default async function AgendaPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  await supabase.rpc("ensure_class_slots", { p_trainer_id: user.id, p_days: 21 });

  const today = new Date().toISOString().slice(0, 10);

  const [{ data: rules }, { data: slots }] = await Promise.all([
    supabase
      .from("availability_rules")
      .select("*")
      .eq("trainer_id", user.id)
      .order("weekday")
      .order("start_time"),
    supabase
      .from("class_slots")
      .select(
        "id, date, start_time, end_time, capacity, canceled, bookings:class_bookings(id, status, student:profiles(full_name))"
      )
      .eq("trainer_id", user.id)
      .eq("canceled", false)
      .gte("date", today)
      .order("date")
      .order("start_time"),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-base-100">Agenda de reposição</h1>
      <p className="mt-1 text-sm text-base-400">
        Defina seus horários fixos e acompanhe quem marcou reposição em cada dia.
      </p>

      <div className="mt-8">
        <RuleForm rules={rules ?? []} />
      </div>

      <div className="mt-8 card">
        <h2 className="text-base font-semibold text-base-100">Próximas vagas</h2>
        <div className="mt-4">
          <SlotList slots={(slots as SlotWithBookings[] | null) ?? []} />
        </div>
      </div>
    </div>
  );
}
