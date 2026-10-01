-- Plans, AI cost tracking, contact inbox and the platform admin helpers.
-- Safe to run more than once.

-- Per-workspace overrides (used by the Custom plan) and an internal note the admin can keep.
alter table public.subscriptions add column if not exists limits jsonb;
alter table public.subscriptions add column if not exists note text;

-- Real token counts per AI call, so the admin panel can show what the AI actually costs.
alter table public.ai_usage add column if not exists input_tokens integer;
alter table public.ai_usage add column if not exists output_tokens integer;
alter table public.ai_usage add column if not exists model text;

-- Messages from the public contact form and upgrade requests.
-- No policies on purpose: only the server (service role) reads and writes this table.
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (char_length(email) between 3 and 200),
  company text check (char_length(company) <= 160),
  phone text check (char_length(phone) <= 40),
  topic text not null default 'general' check (topic in ('general', 'upgrade', 'custom', 'support')),
  plan_interest text check (char_length(plan_interest) <= 40),
  message text not null check (char_length(message) between 1 and 4000),
  workspace_id uuid references public.workspaces(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'new' check (status in ('new', 'handled')),
  created_at timestamptz not null default now(),
  handled_at timestamptz
);
create index if not exists contact_messages_status_idx on public.contact_messages (status, created_at desc);
alter table public.contact_messages enable row level security;
revoke all on public.contact_messages from anon, authenticated;

-- The first account ever created is the platform admin.
create or replace function public.platform_first_user_id()
returns uuid language sql stable security definer set search_path = public, auth as $$
  select id from auth.users order by created_at asc, id asc limit 1
$$;
revoke all on function public.platform_first_user_id() from public, anon, authenticated;
grant execute on function public.platform_first_user_id() to service_role;

-- One row per workspace for the admin overview. Server (service role) only.
create or replace function public.admin_workspaces()
returns table (
  id uuid, name text, created_at timestamptz, owner_email text, plan text, status text, limits jsonb, note text,
  members bigint, documents_month bigint, documents_total bigint, ai_month bigint, tokens_in_month bigint, tokens_out_month bigint
)
language sql stable security definer set search_path = public, auth as $$
  select w.id, w.name, w.created_at,
    (select u.email::text from public.workspace_members m join auth.users u on u.id = m.user_id
      where m.workspace_id = w.id and m.role = 'owner' order by m.created_at limit 1),
    coalesce(s.plan, 'free'), coalesce(s.status, 'active'), s.limits, s.note,
    (select count(*) from public.workspace_members m where m.workspace_id = w.id),
    (select count(*) from public.documents d where d.workspace_id = w.id and d.created_at >= date_trunc('month', now())),
    (select count(*) from public.documents d where d.workspace_id = w.id),
    (select count(*) from public.ai_usage a where a.workspace_id = w.id and a.created_at >= date_trunc('month', now())),
    (select coalesce(sum(a.input_tokens), 0) from public.ai_usage a where a.workspace_id = w.id and a.created_at >= date_trunc('month', now())),
    (select coalesce(sum(a.output_tokens), 0) from public.ai_usage a where a.workspace_id = w.id and a.created_at >= date_trunc('month', now()))
  from public.workspaces w
  left join public.subscriptions s on s.workspace_id = w.id
  order by w.created_at desc
$$;
revoke all on function public.admin_workspaces() from public, anon, authenticated;
grant execute on function public.admin_workspaces() to service_role;
