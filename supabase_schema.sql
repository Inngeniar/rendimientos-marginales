-- Ejecutar este script en el SQL Editor de tu proyecto Supabase
create table if not exists public.saved_exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  complexity text not null,
  notes text default '',
  model_payload jsonb not null,
  summary_result jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.saved_exercises enable row level security;

-- Política abierta para uso con anon key (ajústala si agregas autenticación de usuarios)
create policy "Permitir lectura y escritura publica de ejercicios"
  on public.saved_exercises
  for all
  using (true)
  with check (true);
