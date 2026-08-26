-- Personal Trainer App: esquema inicial
create extension if not exists pgcrypto;

create type public.user_role as enum ('trainer', 'student');

create type public.muscle_group as enum (
  'chest', 'back', 'shoulders', 'biceps', 'triceps',
  'legs', 'glutes', 'calves', 'abs', 'cardio', 'full_body'
);

-- Perfis: cada usuário do Supabase Auth tem um perfil de trainer ou student
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null default 'student',
  full_name text not null,
  avatar_url text,
  phone text,
  trainer_id uuid references public.profiles(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index profiles_trainer_id_idx on public.profiles (trainer_id);

-- Biblioteca de exercícios de cada trainer
create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  muscle_group public.muscle_group not null,
  equipment text,
  video_url text,
  thumbnail_url text,
  instructions text,
  created_at timestamptz not null default now()
);

create index exercises_trainer_id_idx on public.exercises (trainer_id);

-- Fichas de treino atribuídas a um aluno (ex: "Treino A - Peito e Tríceps")
create table public.workout_plans (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  order_index int not null default 0,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index workout_plans_trainer_id_idx on public.workout_plans (trainer_id);
create index workout_plans_student_id_idx on public.workout_plans (student_id);

-- Exercícios dentro de cada ficha, com séries/repetições/carga prescritas
create table public.workout_plan_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_plan_id uuid not null references public.workout_plans(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete restrict,
  order_index int not null default 0,
  sets int not null default 3,
  reps text not null default '10-12',
  rest_seconds int default 60,
  load_kg numeric,
  notes text
);

create index workout_plan_exercises_plan_id_idx on public.workout_plan_exercises (workout_plan_id);

-- Sessões de treino realizadas pelo aluno
create table public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  workout_plan_id uuid not null references public.workout_plans(id) on delete cascade,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  duration_minutes int
);

create index workout_logs_student_id_idx on public.workout_logs (student_id);
create index workout_logs_plan_id_idx on public.workout_logs (workout_plan_id);

-- Séries de fato executadas em cada sessão (progresso real vs. prescrito)
create table public.workout_log_sets (
  id uuid primary key default gen_random_uuid(),
  workout_log_id uuid not null references public.workout_logs(id) on delete cascade,
  workout_plan_exercise_id uuid not null references public.workout_plan_exercises(id) on delete cascade,
  set_number int not null,
  reps_done int,
  load_kg_done numeric,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

create index workout_log_sets_log_id_idx on public.workout_log_sets (workout_log_id);

-- Funções auxiliares (security definer para evitar recursão de RLS em profiles)
create or replace function public.my_trainer_id()
returns uuid
language sql security definer stable
set search_path = public
as $$
  select trainer_id from public.profiles where id = auth.uid();
$$;

create or replace function public.is_trainer(check_id uuid)
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists(
    select 1 from public.profiles
    where id = check_id and role = 'trainer'
  );
$$;

-- Cria automaticamente um perfil quando um usuário se cadastra no Auth.
-- Espera metadata: { "role": "trainer" | "student", "full_name": "...", "trainer_id": "uuid opcional" }
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name, trainer_id)
  values (
    new.id,
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'student'),
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    nullif(new.raw_user_meta_data->>'trainer_id', '')::uuid
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.exercises enable row level security;
alter table public.workout_plans enable row level security;
alter table public.workout_plan_exercises enable row level security;
alter table public.workout_logs enable row level security;
alter table public.workout_log_sets enable row level security;

-- profiles: cada um vê a si mesmo, o trainer vê seus alunos, o aluno vê seu trainer
create policy profiles_select on public.profiles for select
  using (
    id = auth.uid()
    or trainer_id = auth.uid()
    or id = public.my_trainer_id()
  );

create policy profiles_update_own on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- exercises: trainer gerencia os seus; aluno só enxerga os do seu trainer
create policy exercises_select on public.exercises for select
  using (trainer_id = auth.uid() or trainer_id = public.my_trainer_id());

create policy exercises_insert on public.exercises for insert
  with check (trainer_id = auth.uid());

create policy exercises_update on public.exercises for update
  using (trainer_id = auth.uid());

create policy exercises_delete on public.exercises for delete
  using (trainer_id = auth.uid());

-- workout_plans: trainer gerencia; aluno só lê as suas
create policy workout_plans_select on public.workout_plans for select
  using (trainer_id = auth.uid() or student_id = auth.uid());

create policy workout_plans_insert on public.workout_plans for insert
  with check (trainer_id = auth.uid());

create policy workout_plans_update on public.workout_plans for update
  using (trainer_id = auth.uid());

create policy workout_plans_delete on public.workout_plans for delete
  using (trainer_id = auth.uid());

-- workout_plan_exercises: segue a permissão da ficha (workout_plan) associada
create policy workout_plan_exercises_select on public.workout_plan_exercises for select
  using (
    exists (
      select 1 from public.workout_plans wp
      where wp.id = workout_plan_id
        and (wp.trainer_id = auth.uid() or wp.student_id = auth.uid())
    )
  );

create policy workout_plan_exercises_write on public.workout_plan_exercises for all
  using (
    exists (
      select 1 from public.workout_plans wp
      where wp.id = workout_plan_id and wp.trainer_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.workout_plans wp
      where wp.id = workout_plan_id and wp.trainer_id = auth.uid()
    )
  );

-- workout_logs: aluno registra os próprios treinos; trainer só lê os dos seus alunos
create policy workout_logs_select on public.workout_logs for select
  using (
    student_id = auth.uid()
    or exists (
      select 1 from public.workout_plans wp
      where wp.id = workout_plan_id and wp.trainer_id = auth.uid()
    )
  );

create policy workout_logs_insert on public.workout_logs for insert
  with check (student_id = auth.uid());

create policy workout_logs_update on public.workout_logs for update
  using (student_id = auth.uid());

-- workout_log_sets: segue a permissão da sessão (workout_log) associada
create policy workout_log_sets_select on public.workout_log_sets for select
  using (
    exists (
      select 1 from public.workout_logs wl
      where wl.id = workout_log_id
        and (
          wl.student_id = auth.uid()
          or exists (
            select 1 from public.workout_plans wp
            where wp.id = wl.workout_plan_id and wp.trainer_id = auth.uid()
          )
        )
    )
  );

create policy workout_log_sets_write on public.workout_log_sets for all
  using (
    exists (
      select 1 from public.workout_logs wl
      where wl.id = workout_log_id and wl.student_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.workout_logs wl
      where wl.id = workout_log_id and wl.student_id = auth.uid()
    )
  );
