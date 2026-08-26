-- Cardio: sessões prescritas pelo trainer e execuções registradas pelo aluno
create type public.cardio_activity as enum (
  'walking', 'running', 'cycling', 'elliptical', 'stair_climber', 'jump_rope', 'rowing', 'other'
);

create type public.cardio_intensity as enum ('light', 'moderate', 'intense');

create table public.cardio_sessions (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  activity public.cardio_activity not null,
  intensity public.cardio_intensity not null default 'moderate',
  duration_minutes int not null default 20,
  instructions text,
  order_index int not null default 0,
  active boolean not null default true,
  valid_until date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index cardio_sessions_trainer_id_idx on public.cardio_sessions (trainer_id);
create index cardio_sessions_student_id_idx on public.cardio_sessions (student_id);

create table public.cardio_logs (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  cardio_session_id uuid not null references public.cardio_sessions(id) on delete cascade,
  duration_minutes_done int,
  distance_km numeric,
  notes text,
  completed_at timestamptz not null default now()
);

create index cardio_logs_student_id_idx on public.cardio_logs (student_id);
create index cardio_logs_session_id_idx on public.cardio_logs (cardio_session_id);

alter table public.cardio_sessions enable row level security;
alter table public.cardio_logs enable row level security;

create policy cardio_sessions_select on public.cardio_sessions for select
  using (trainer_id = auth.uid() or student_id = auth.uid());

create policy cardio_sessions_insert on public.cardio_sessions for insert
  with check (trainer_id = auth.uid());

create policy cardio_sessions_update on public.cardio_sessions for update
  using (trainer_id = auth.uid());

create policy cardio_sessions_delete on public.cardio_sessions for delete
  using (trainer_id = auth.uid());

create policy cardio_logs_select on public.cardio_logs for select
  using (
    student_id = auth.uid()
    or exists (
      select 1 from public.cardio_sessions cs
      where cs.id = cardio_session_id and cs.trainer_id = auth.uid()
    )
  );

create policy cardio_logs_insert on public.cardio_logs for insert
  with check (student_id = auth.uid());

create policy cardio_logs_update on public.cardio_logs for update
  using (student_id = auth.uid());
