-- Creates boochat_membership table to track which users joined the partner channel
create table if not exists public.boochat_membership (
  user_id text primary key,
  joined_at timestamptz not null default now()
);

create index if not exists idx_boochat_membership_user on public.boochat_membership(user_id);
