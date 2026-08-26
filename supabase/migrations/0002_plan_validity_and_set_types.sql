-- Validade da ficha de treino (ex: "vence em 8 dias", como no treino.io)
alter table public.workout_plans
  add column valid_until date;

-- Divisão de séries por tipo: aquecimento, preparatória e válidas (as que contam pra progresso)
alter table public.workout_plan_exercises
  add column warmup_sets int not null default 0,
  add column warmup_reps text,
  add column prep_sets int not null default 0,
  add column prep_reps text;

comment on column public.workout_plan_exercises.sets is 'Séries válidas (as que contam para volume/progresso)';
comment on column public.workout_plan_exercises.reps is 'Faixa de repetições das séries válidas';
