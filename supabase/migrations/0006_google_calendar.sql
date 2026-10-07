-- Conexão com o Google Calendar: guarda o refresh token de cada personal
-- que conectou a própria conta. Nunca exposto ao navegador — só lido em
-- código de servidor.
create table public.google_accounts (
  trainer_id uuid primary key references public.profiles(id) on delete cascade,
  refresh_token text not null,
  calendar_id text not null default 'primary',
  connected_at timestamptz not null default now()
);

alter table public.google_accounts enable row level security;

create policy google_accounts_all on public.google_accounts for all
  using (trainer_id = auth.uid())
  with check (trainer_id = auth.uid());
