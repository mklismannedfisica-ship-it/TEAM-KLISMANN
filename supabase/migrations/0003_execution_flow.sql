-- Tipo de série registrada (aquecimento, preparatória ou válida)
create type public.set_type as enum ('warmup', 'prep', 'valid');

alter table public.workout_log_sets
  add column set_type public.set_type not null default 'valid';

-- Avaliação de esforço, observações e foto de progresso ao concluir o treino
alter table public.workout_logs
  add column effort_rating smallint check (effort_rating between 1 and 5),
  add column notes text,
  add column photo_url text;

-- Bucket público para fotos de progresso enviadas pelo aluno ao concluir o treino
insert into storage.buckets (id, name, public)
values ('workout-photos', 'workout-photos', true)
on conflict (id) do nothing;

create policy "Alunos enviam suas próprias fotos de treino"
  on storage.objects for insert
  with check (
    bucket_id = 'workout-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Fotos de treino são públicas para leitura"
  on storage.objects for select
  using (bucket_id = 'workout-photos');

create policy "Alunos removem suas próprias fotos de treino"
  on storage.objects for delete
  using (
    bucket_id = 'workout-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
