-- Agenda do personal: horário fixo de cada aluno, sessões geradas a partir
-- dele, pedidos de troca de horário (sempre aprovados por você) e aviso
-- quando um aluno pede outro horário.

create table public.student_schedules (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  weekday int not null check (weekday between 0 and 6), -- 0 = domingo
  start_time time not null,
  end_time time not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);

create index student_schedules_trainer_id_idx on public.student_schedules (trainer_id);
create index student_schedules_student_id_idx on public.student_schedules (student_id);

create table public.class_sessions (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  schedule_id uuid references public.student_schedules(id) on delete set null,
  date date not null,
  start_time time not null,
  end_time time not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'canceled')),
  confirmation_sent boolean not null default false,
  feedback_sent boolean not null default false,
  google_event_id text,
  created_at timestamptz not null default now(),
  unique (trainer_id, student_id, date, start_time)
);

create index class_sessions_trainer_id_date_idx on public.class_sessions (trainer_id, date);
create index class_sessions_student_id_idx on public.class_sessions (student_id);

create table public.reschedule_requests (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid references public.class_sessions(id) on delete set null,
  requested_date date not null,
  requested_start_time time not null,
  requested_end_time time not null,
  note text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  trainer_note text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index reschedule_requests_trainer_id_idx on public.reschedule_requests (trainer_id, status);
create index reschedule_requests_student_id_idx on public.reschedule_requests (student_id);

create table public.trainer_notifications (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles(id) on delete cascade,
  reschedule_request_id uuid references public.reschedule_requests(id) on delete set null,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index trainer_notifications_trainer_id_idx on public.trainer_notifications (trainer_id, read);

-- Gera as sessões dos próximos N dias a partir dos horários fixos ativos.
-- Chamada pelo painel do personal ao abrir a agenda.
create or replace function public.ensure_class_sessions(p_trainer_id uuid, p_days int default 28)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if auth.uid() <> p_trainer_id then
    raise exception 'not_allowed';
  end if;

  insert into public.class_sessions (trainer_id, student_id, schedule_id, date, start_time, end_time)
  select
    s.trainer_id,
    s.student_id,
    s.id,
    d::date,
    s.start_time,
    s.end_time
  from public.student_schedules s
  cross join generate_series(current_date, current_date + (p_days || ' days')::interval, interval '1 day') as d
  where s.active
    and s.trainer_id = p_trainer_id
    and extract(dow from d) = s.weekday
  on conflict (trainer_id, student_id, date, start_time) do nothing;
end;
$$;

-- Notifica o personal quando um aluno pede outro horário.
create or replace function public.notify_trainer_on_reschedule_request()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  student_name text;
begin
  select full_name into student_name from public.profiles where id = new.student_id;

  insert into public.trainer_notifications (trainer_id, reschedule_request_id, message)
  values (
    new.trainer_id,
    new.id,
    student_name || ' pediu outro horário: ' || to_char(new.requested_date, 'DD/MM') || ' às ' || to_char(new.requested_start_time, 'HH24:MI') || '.'
  );

  return new;
end;
$$;

create trigger reschedule_requests_notify
  after insert on public.reschedule_requests
  for each row execute procedure public.notify_trainer_on_reschedule_request();

-- Row Level Security
alter table public.student_schedules enable row level security;
alter table public.class_sessions enable row level security;
alter table public.reschedule_requests enable row level security;
alter table public.trainer_notifications enable row level security;

-- student_schedules: só o próprio personal gerencia; aluno vê o seu
create policy student_schedules_select on public.student_schedules for select
  using (trainer_id = auth.uid() or student_id = auth.uid());

create policy student_schedules_write on public.student_schedules for all
  using (trainer_id = auth.uid())
  with check (trainer_id = auth.uid());

-- class_sessions: personal gerencia as suas; aluno só vê e lê as próprias
create policy class_sessions_select on public.class_sessions for select
  using (trainer_id = auth.uid() or student_id = auth.uid());

create policy class_sessions_write on public.class_sessions for all
  using (trainer_id = auth.uid())
  with check (trainer_id = auth.uid());

-- reschedule_requests: aluno cria e lê os próprios pedidos; personal lê e decide os seus
create policy reschedule_requests_select on public.reschedule_requests for select
  using (student_id = auth.uid() or trainer_id = auth.uid());

create policy reschedule_requests_insert on public.reschedule_requests for insert
  with check (student_id = auth.uid() and trainer_id = public.my_trainer_id());

create policy reschedule_requests_update on public.reschedule_requests for update
  using (trainer_id = auth.uid());

-- trainer_notifications: só o próprio personal lê e marca como lida
create policy trainer_notifications_select on public.trainer_notifications for select
  using (trainer_id = auth.uid());

create policy trainer_notifications_update on public.trainer_notifications for update
  using (trainer_id = auth.uid());
