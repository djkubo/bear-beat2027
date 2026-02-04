-- Por cada drop mensual, registra a qué usuarios ya se les envió la alerta SMS (evitar repetir).
-- drop_key = slug del pack, ej. febrero-2026
create table if not exists public.drop_alerts_sent (
  user_id uuid not null references public.users(id) on delete cascade,
  drop_key text not null,
  sent_at timestamptz default now(),
  primary key (user_id, drop_key)
);

comment on table public.drop_alerts_sent is 'Usuarios que ya recibieron SMS de alerta de nuevo drop (cron mensual).';
