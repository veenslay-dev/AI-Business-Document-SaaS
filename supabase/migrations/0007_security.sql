-- Security hardening. Safe to run more than once.

-- 1. The platform admin is fixed the first time it is looked up and stays the same person.
--    If that account is ever deleted there is no admin, instead of the next oldest account inheriting the role.
create table if not exists public.platform_settings (
  key text primary key,
  value text not null,
  created_at timestamptz not null default now()
);
alter table public.platform_settings enable row level security;
revoke all on public.platform_settings from anon, authenticated;

create or replace function public.platform_first_user_id()
returns uuid language plpgsql security definer set search_path = public, auth as $$
declare pinned text; found uuid;
begin
  select value into pinned from public.platform_settings where key = 'admin_user_id';
  if pinned is not null then
    select id into found from auth.users where id = pinned::uuid;
    return found; -- null when that account no longer exists
  end if;
  select id into found from auth.users order by created_at asc, id asc limit 1;
  if found is not null then
    insert into public.platform_settings (key, value) values ('admin_user_id', found::text) on conflict (key) do nothing;
  end if;
  return found;
end;
$$;
revoke all on function public.platform_first_user_id() from public, anon, authenticated;
grant execute on function public.platform_first_user_id() to service_role;

-- 2. Contact form: remember a hash of the sender's address so one source can't flood the inbox.
alter table public.contact_messages add column if not exists ip_hash text;
create index if not exists contact_messages_ip_idx on public.contact_messages (ip_hash, created_at desc);

-- 3. AI usage grouped by person and kind of request, for the admin cost pages. Server (service role) only.
create or replace function public.admin_ai_usage(p_from timestamptz default null, p_to timestamptz default null)
returns table (user_id uuid, workspace_id uuid, operation text, model text, calls bigint, tokens_in bigint, tokens_out bigint)
language sql stable security definer set search_path = public as $$
  select a.user_id, a.workspace_id, a.operation, coalesce(a.model, 'unknown'), count(*),
         coalesce(sum(a.input_tokens), 0)::bigint, coalesce(sum(a.output_tokens), 0)::bigint
  from public.ai_usage a
  where a.operation <> 'audit_scan'
    and (p_from is null or a.created_at >= p_from)
    and (p_to is null or a.created_at < p_to)
  group by a.user_id, a.workspace_id, a.operation, coalesce(a.model, 'unknown')
$$;
revoke all on function public.admin_ai_usage(timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.admin_ai_usage(timestamptz, timestamptz) to service_role;
