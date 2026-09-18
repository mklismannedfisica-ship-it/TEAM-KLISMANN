-- Agenda de reposição: horários fixos do personal, vagas geradas por semana,
-- marcações dos alunos e notificações para o personal.

create table public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles(id) on delete cascade,
  weekday int not null check (weekday between 0 and 6), -- 0 = domingo
  start_time time not null,
  end_time time not null,
  capacity int not null default 1 check (capacity > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);

create index availability_rules_trainer_id_idx on public.availability_rules (trainer_id);

create table public.class_slots (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles(id) on delete cascade,
  rule_id uuid references public.availability_rules(id) on delete set null,
  date date not null,
  start_time time not null,
  end_time time not null,
  capacity int not null default 1 check (capacity > 0),
  canceled boolean not null default false,
  created_at timestamptz not null default now(),
  unique (trainer_id, date, start_time)
);

create index class_slots_trainer_id_date_idx on public.class_slots (trainer_id, date);

create table public.class_bookings (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references public.class_slots(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'booked' check (status in ('booked', 'canceled')),
  canceled_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  canceled_at timestamptz
);

create index class_bookings_slot_id_idx on public.class_bookings (slot_id);
create index class_bookings_student_id_idx on public.class_bookings (student_id);

-- Evita duas marcações ativas do mesmo aluno na mesma vaga
create unique index class_bookings_active_unique
  on public.class_bookings (slot_id, student_id)
  where (status = 'booked');

create table public.trainer_notifications (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles(id) on delete cascade,
  booking_id uuid references public.class_bookings(id) on delete set null,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index trainer_notifications_trainer_id_idx on public.trainer_notifications (trainer_id, read);

-- Garante vagas geradas a partir das regras ativas, para os próximos N dias.
-- Chamada tanto pelo painel do personal quanto pela área do aluno.
create or replace function public.ensure_class_slots(p_trainer_id uuid, p_days int default 21)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
begin
  if caller is null then
    raise exception 'not_authenticated';
  end if;

  if caller <> p_trainer_id
     and not exists (
       select 1 from public.profiles where id = caller and trainer_id = p_trainer_id
     )
  then
    raise exception 'not_allowed';
  end if;

  insert into public.class_slots (trainer_id, rule_id, date, start_time, end_time, capacity)
  select
    r.trainer_id,
    r.id,
    d::date,
    r.start_time,
    r.end_time,
    r.capacity
  from public.availability_rules r
  cross join generate_series(current_date, current_date + (p_days || ' days')::interval, interval '1 day') as d
  where r.active
    and r.trainer_id = p_trainer_id
    and extract(dow from d) = r.weekday
  on conflict (trainer_id, date, start_time) do nothing;
end;
$$;

-- Impede marcar acima da capacidade ou em vaga passada/cancelada.
create or replace function public.check_booking_capacity()
returns trigger
language plpgsql
as $$
declare
  slot record;
  active_count int;
begin
  select * into slot from public.class_slots where id = new.slot_id;

  if slot is null then
    raise exception 'Vaga não encontrada.';
  end if;

  if slot.canceled then
    raise exception 'Essa vaga foi cancelada.';
  end if;

  if (slot.date + slot.start_time) < now() then
    raise exception 'Essa vaga já passou.';
  end if;

  select count(*) into active_count
  from public.class_bookings
  where slot_id = new.slot_id and status = 'booked';

  if active_count >= slot.capacity then
    raise exception 'Vaga esgotada.';
  end if;

  return new;
end;
$$;

create trigger class_bookings_check_capacity
  before insert on public.class_bookings
  for each row execute procedure public.check_booking_capacity();

-- Notifica o personal quando um aluno marca ou cancela uma reposição.
create or replace function public.notify_trainer_on_booking_change()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  slot record;
  student_name text;
begin
  select * into slot from public.class_slots where id = coalesce(new.slot_id, old.slot_id);
  select full_name into student_name from public.profiles where id = coalesce(new.student_id, old.student_id);

  if tg_op = 'INSERT' then
    insert into public.trainer_notifications (trainer_id, booking_id, message)
    values (
      slot.trainer_id,
      new.id,
      student_name || ' marcou reposição em ' || to_char(slot.date, 'DD/MM') || ' às ' || to_char(slot.start_time, 'HH24:MI') || '.'
    );
  elsif tg_op = 'UPDATE' and new.status = 'canceled' and old.status = 'booked' and new.canceled_by = new.student_id then
    insert into public.trainer_notifications (trainer_id, booking_id, message)
    values (
      slot.trainer_id,
      new.id,
      student_name || ' cancelou a reposição de ' || to_char(slot.date, 'DD/MM') || ' às ' || to_char(slot.start_time, 'HH24:MI') || '.'
    );
  end if;

  return new;
end;
$$;

create trigger class_bookings_notify
  after insert or update on public.class_bookings
  for each row execute procedure public.notify_trainer_on_booking_change();

-- Quando o personal cancela a vaga inteira, cancela as marcações ativas dela.
create or replace function public.cancel_bookings_on_slot_cancel()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.canceled and not old.canceled then
    update public.class_bookings
    set status = 'canceled', canceled_by = new.trainer_id, canceled_at = now()
    where slot_id = new.id and status = 'booked';
  end if;
  return new;
end;
$$;

create trigger class_slots_cancel_bookings
  after update on public.class_slots
  for each row execute procedure public.cancel_bookings_on_slot_cancel();

-- Row Level Security
alter table public.availability_rules enable row level security;
alter table public.class_slots enable row level security;
alter table public.class_bookings enable row level security;
alter table public.trainer_notifications enable row level security;

-- availability_rules: só o próprio personal gerencia; aluno enxerga as do seu personal
create policy availability_rules_select on public.availability_rules for select
  using (trainer_id = auth.uid() or trainer_id = public.my_trainer_id());

create policy availability_rules_write on public.availability_rules for all
  using (trainer_id = auth.uid())
  with check (trainer_id = auth.uid());

-- class_slots: personal gerencia as suas; aluno enxerga as do seu personal
create policy class_slots_select on public.class_slots for select
  using (trainer_id = auth.uid() or trainer_id = public.my_trainer_id());

create policy class_slots_insert on public.class_slots for insert
  with check (trainer_id = auth.uid());

create policy class_slots_update on public.class_slots for update
  using (trainer_id = auth.uid());

create policy class_slots_delete on public.class_slots for delete
  using (trainer_id = auth.uid());

-- class_bookings: aluno marca/cancela as próprias; personal vê e cancela as dos seus alunos
create policy class_bookings_select on public.class_bookings for select
  using (
    student_id = auth.uid()
    or exists (select 1 from public.class_slots s where s.id = slot_id and s.trainer_id = auth.uid())
  );

create policy class_bookings_insert on public.class_bookings for insert
  with check (
    student_id = auth.uid()
    and exists (
      select 1 from public.class_slots s
      where s.id = slot_id and s.trainer_id = public.my_trainer_id()
    )
  );

create policy class_bookings_update on public.class_bookings for update
  using (
    student_id = auth.uid()
    or exists (select 1 from public.class_slots s where s.id = slot_id and s.trainer_id = auth.uid())
  );

-- trainer_notifications: só o próprio personal lê e marca como lida
create policy trainer_notifications_select on public.trainer_notifications for select
  using (trainer_id = auth.uid());

create policy trainer_notifications_update on public.trainer_notifications for update
  using (trainer_id = auth.uid());
