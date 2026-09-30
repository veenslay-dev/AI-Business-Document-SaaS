-- Team invites, notification preferences, per-document tracking stats, dashboard stats.

alter table public.profiles
  add column notification_prefs jsonb not null
    default '{"document_viewed": true, "document_accepted": true, "changes_requested": true}'::jsonb,
  add column notifications_seen_at timestamptz;

create table public.workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null,
  role public.workspace_role not null default 'member',
  token text not null unique default encode(gen_random_bytes(20), 'hex'),
  invited_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  constraint invite_role_not_owner check (role <> 'owner')
);
create unique index workspace_invites_open_uidx
  on public.workspace_invites (workspace_id, lower(email)) where accepted_at is null;

alter table public.workspace_invites enable row level security;
-- Only admins see and manage invites. Accepting one goes through the server (service role),
-- which checks that the signed-in user's email matches.
create policy invites_admin_all on public.workspace_invites
  for all to authenticated
  using (public.is_workspace_admin(workspace_id))
  with check (public.is_workspace_admin(workspace_id) and role <> 'owner');

-- One default template per type per workspace.
create unique index document_templates_default_uidx
  on public.document_templates (workspace_id, type) where is_default and workspace_id is not null;

-- View counts and last view for each document. security_invoker keeps RLS in force.
create view public.document_stats with (security_invoker = true) as
  select d.id as document_id, d.workspace_id,
         count(v.id)::int as views, max(v.viewed_at) as last_viewed_at
  from public.documents d
  left join public.document_views v on v.document_id = d.id
  group by d.id, d.workspace_id;
grant select on public.document_stats to authenticated;

-- Dashboard numbers in one round trip. SECURITY INVOKER: RLS returns zeros for other workspaces.
create or replace function public.dashboard_stats(ws uuid)
returns jsonb language sql stable security invoker set search_path = public as $$
  select jsonb_build_object(
    'total', count(*),
    'proposals', count(*) filter (where type = 'proposal'),
    'quotations', count(*) filter (where type = 'quotation'),
    'audits', count(*) filter (where type = 'seo_audit'),
    'accepted_proposals', count(*) filter (where type = 'proposal' and status = 'accepted'),
    'quotation_value', coalesce((
      select jsonb_object_agg(currency, total) from (
        select coalesce(currency, 'INR') as currency, sum(total_amount) as total
        from public.documents
        where workspace_id = ws and type = 'quotation' and total_amount is not null
        group by 1
      ) q
    ), '{}'::jsonb)
  )
  from public.documents where workspace_id = ws;
$$;
grant execute on function public.dashboard_stats(uuid) to authenticated;
