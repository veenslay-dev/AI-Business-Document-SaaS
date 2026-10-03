-- Online payments (Razorpay). Safe to run more than once.
-- Members can read their own workspace's payments. Only the server (service role) writes them.
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  plan text not null check (plan in ('professional', 'agency')),
  period text not null check (period in ('monthly', 'yearly')),
  amount_paise integer not null check (amount_paise > 0),
  currency text not null default 'INR',
  razorpay_order_id text not null unique,
  razorpay_payment_id text,
  status text not null default 'created' check (status in ('created', 'paid', 'failed')),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index if not exists payments_workspace_idx on public.payments (workspace_id, created_at desc);
create index if not exists payments_status_idx on public.payments (status, created_at desc);

alter table public.payments enable row level security;
drop policy if exists payments_read on public.payments;
create policy payments_read on public.payments for select to authenticated using (public.is_workspace_member(workspace_id));
revoke all on public.payments from anon, authenticated;
grant select on public.payments to authenticated;
