import { createClient } from "@/lib/supabase/server";
import { BookingList, type MyBooking, type SlotWithBookings } from "./booking-list";

export default async function ReposicaoPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("trainer_id")
    .eq("id", user.id)
    .single();

  if (!profile?.trainer_id) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-base-100">Reposição</h1>
        <p className="mt-3 text-sm text-base-400">
          Seu personal ainda não está vinculado à sua conta.
        </p>
      </div>
    );
  }

  await supabase.rpc("ensure_class_slots", { p_trainer_id: profile.trainer_id, p_days: 21 });

  const today = new Date().toISOString().slice(0, 10);

  const [{ data: slots }, { data: myBookings }] = await Promise.all([
    supabase
      .from("class_slots")
      .select("id, date, start_time, end_time, capacity, bookings:class_bookings(status, student_id)")
      .eq("trainer_id", profile.trainer_id)
      .eq("canceled", false)
      .gte("date", today)
      .order("date")
      .order("start_time"),
    supabase
      .from("class_bookings")
      .select("id, slot:class_slots!inner(date, start_time, end_time)")
      .eq("student_id", user.id)
      .eq("status", "booked")
      .gte("slot.date", today),
  ]);

  const upcomingBookings = (myBookings ?? []).filter((b) => b.slot);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-base-100">Reposição</h1>
      <p className="mt-1 text-sm text-base-400">
        Marque sua aula de reposição nos horários que seu personal disponibilizou.
      </p>

      <div className="mt-6">
        <BookingList
          slots={(slots as SlotWithBookings[] | null) ?? []}
          myBookings={upcomingBookings as MyBooking[]}
          studentId={user.id}
        />
      </div>
    </div>
  );
}
