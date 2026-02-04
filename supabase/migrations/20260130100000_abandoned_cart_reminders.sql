-- Tabla para marcar usuarios a los que ya se les envió el recordatorio de carrito abandonado
-- (cron /api/cron/abandoned-cart). Evita enviar el mismo recordatorio más de una vez.
create table if not exists public.abandoned_cart_reminders (
  user_id uuid primary key references public.users(id) on delete cascade,
  sent_at timestamptz default now()
);

comment on table public.abandoned_cart_reminders is 'Usuarios que ya recibieron email/SMS de recuperación de carrito abandonado (cron).';
