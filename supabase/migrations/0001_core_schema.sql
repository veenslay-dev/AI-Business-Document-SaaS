-- Core schema: multi-tenant workspaces, brand, clients, documents.
-- Every tenant table carries workspace_id and is protected by Row Level Security.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.workspace_role as enum ('owner', 'admin', 'member');
create type public.document_type as enum ('proposal', 'quotation', 'seo_audit', 'report');
create type public.document_status as enum ('draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired');
create type public.document_action_type as enum ('viewed', 'downloaded', 'accepted', 'rejected', 'comment_added');
create type public.project_status as enum ('planned', 'active', 'on_hold', 'completed', 'cancelled');

-- ---------------------------------------------------------------------------
-- Shared trigger: keep updated_at fresh
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Workspaces and membership
-- ---------------------------------------------------------------------------
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  is_demo boolean not null default false,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.workspace_role not null default 'member',
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);
create index workspace_members_user_idx on public.workspace_members (user_id);

-- Membership helpers. SECURITY DEFINER so policies on workspace_members
-- do not recurse into themselves.
create or replace function public.is_workspace_member(ws uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = ws and user_id = auth.uid()
  );
$$;

create or replace function public.workspace_role_of(ws uuid)
returns public.workspace_role language sql stable security definer set search_path = public as $$
  select role from public.workspace_members
  where workspace_id = ws and user_id = auth.uid();
$$;

create or replace function public.is_workspace_admin(ws uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.workspace_role_of(ws) in ('owner', 'admin'), false);
$$;

-- ---------------------------------------------------------------------------
-- Company profile and brand kit (one row each per workspace)
-- ---------------------------------------------------------------------------
create table public.company_profiles (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references public.workspaces(id) on delete cascade,
  company_name text not null default '',
  tagline text,
  description text,
  website text,
  email text,
  phone text,
  address text,
  gst_number text,
  pan_number text,
  services jsonb not null default '[]'::jsonb,
  default_terms text,
  authorized_name text,
  authorized_designation text,
  signature_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.brand_kits (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references public.workspaces(id) on delete cascade,
  primary_color text not null default '#1f3a5f',
  secondary_color text not null default '#e8eef6',
  accent_color text not null default '#c8553d',
  heading_font text not null default 'Fraunces',
  body_font text not null default 'Inter',
  logo_url text,
  dark_logo_url text,
  favicon_url text,
  default_footer text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- CRM: clients and projects
-- ---------------------------------------------------------------------------
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  company_name text not null,
  contact_name text,
  email text,
  phone text,
  website text,
  industry text,
  address text,
  gst_number text,
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index clients_workspace_idx on public.clients (workspace_id, created_at desc);
-- Composite key lets child tables prove client and workspace agree.
create unique index clients_id_workspace_uidx on public.clients (id, workspace_id);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id uuid not null,
  name text not null,
  description text,
  status public.project_status not null default 'planned',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (client_id, workspace_id) references public.clients (id, workspace_id) on delete cascade
);
create index projects_workspace_idx on public.projects (workspace_id, created_at desc);
create index projects_client_idx on public.projects (client_id);
create unique index projects_id_workspace_uidx on public.projects (id, workspace_id);

-- ---------------------------------------------------------------------------
-- Templates
-- ---------------------------------------------------------------------------
create table public.document_templates (
  id uuid primary key default gen_random_uuid(),
  -- null workspace_id means a built-in system template
  workspace_id uuid references public.workspaces(id) on delete cascade,
  key text,
  name text not null,
  type public.document_type not null,
  template_config jsonb not null default '{}'::jsonb,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index document_templates_workspace_idx on public.document_templates (workspace_id, type);

-- ---------------------------------------------------------------------------
-- Documents
-- ---------------------------------------------------------------------------
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id uuid,
  project_id uuid,
  type public.document_type not null,
  title text not null,
  status public.document_status not null default 'draft',
  content_json jsonb not null default '{}'::jsonb,
  template_id uuid references public.document_templates(id) on delete set null,
  template_key text,
  -- Brand + company snapshot frozen when a document is first sent, so historical
  -- documents keep their appearance after the brand kit changes.
  brand_snapshot jsonb,
  finalized_at timestamptz,
  total_amount numeric(14, 2),
  currency text,
  expires_at timestamptz,
  public_token text not null unique default encode(gen_random_bytes(24), 'hex'),
  pdf_url text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (client_id, workspace_id) references public.clients (id, workspace_id) on delete set null (client_id),
  foreign key (project_id, workspace_id) references public.projects (id, workspace_id) on delete set null (project_id)
);
create index documents_workspace_idx on public.documents (workspace_id, updated_at desc);
create index documents_client_idx on public.documents (client_id);
create index documents_type_idx on public.documents (workspace_id, type, status);

create table public.document_views (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  ip_hash text,
  user_agent text,
  duration_seconds integer
);
create index document_views_document_idx on public.document_views (document_id, viewed_at desc);

create table public.document_actions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  action public.document_action_type not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index document_actions_document_idx on public.document_actions (document_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Pricing packages, knowledge base, AI usage, subscriptions
-- ---------------------------------------------------------------------------
create table public.pricing_packages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  tier text not null default 'standard',
  name text not null,
  description text,
  price numeric(14, 2) not null default 0,
  currency text not null default 'INR',
  features jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index pricing_packages_workspace_idx on public.pricing_packages (workspace_id, sort_order);

create table public.knowledge_base_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null,
  type text not null default 'note',
  content text,
  file_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index knowledge_base_workspace_idx on public.knowledge_base_items (workspace_id, type);

create table public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  operation text not null,
  provider text,
  created_at timestamptz not null default now()
);
create index ai_usage_workspace_idx on public.ai_usage (workspace_id, created_at desc);

-- Billing is provider-agnostic; Stripe or Razorpay ids live in provider_* columns.
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references public.workspaces(id) on delete cascade,
  plan text not null default 'free',
  status text not null default 'active',
  provider text,
  provider_customer_id text,
  provider_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','workspaces','company_profiles','brand_kits','clients','projects',
    'document_templates','documents','pricing_packages','knowledge_base_items','subscriptions'
  ] loop
    execute format(
      'create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Workspace creation (atomic, avoids RLS chicken-and-egg on first membership)
-- ---------------------------------------------------------------------------
create or replace function public.create_workspace(p_name text, p_slug text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  ws uuid;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if length(trim(p_name)) = 0 then
    raise exception 'workspace name required';
  end if;

  insert into public.workspaces (name, slug) values (trim(p_name), p_slug) returning id into ws;
  insert into public.workspace_members (workspace_id, user_id, role) values (ws, uid, 'owner');
  insert into public.company_profiles (workspace_id, company_name) values (ws, trim(p_name));
  insert into public.brand_kits (workspace_id) values (ws);
  insert into public.subscriptions (workspace_id) values (ws);
  return ws;
end;
$$;

revoke all on function public.create_workspace(text, text) from public, anon;
grant execute on function public.create_workspace(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.company_profiles enable row level security;
alter table public.brand_kits enable row level security;
alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.document_templates enable row level security;
alter table public.documents enable row level security;
alter table public.document_views enable row level security;
alter table public.document_actions enable row level security;
alter table public.pricing_packages enable row level security;
alter table public.knowledge_base_items enable row level security;
alter table public.ai_usage enable row level security;
alter table public.subscriptions enable row level security;

-- profiles: a user manages only their own row; teammates can read names.
create policy profiles_self_all on public.profiles
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy profiles_teammates_read on public.profiles
  for select to authenticated
  using (exists (
    select 1 from public.workspace_members a
    join public.workspace_members b on a.workspace_id = b.workspace_id
    where a.user_id = auth.uid() and b.user_id = profiles.user_id
  ));

-- workspaces
create policy workspaces_member_read on public.workspaces
  for select to authenticated using (public.is_workspace_member(id));
create policy workspaces_admin_update on public.workspaces
  for update to authenticated
  using (public.is_workspace_admin(id)) with check (public.is_workspace_admin(id));
create policy workspaces_owner_delete on public.workspaces
  for delete to authenticated using (public.workspace_role_of(id) = 'owner');

-- workspace_members: members see the roster; only admins manage it.
create policy members_read on public.workspace_members
  for select to authenticated using (public.is_workspace_member(workspace_id));
create policy members_admin_insert on public.workspace_members
  for insert to authenticated
  with check (public.is_workspace_admin(workspace_id) and role <> 'owner');
create policy members_admin_update on public.workspace_members
  for update to authenticated
  using (public.is_workspace_admin(workspace_id) and role <> 'owner')
  with check (public.is_workspace_admin(workspace_id) and role <> 'owner');
create policy members_admin_delete on public.workspace_members
  for delete to authenticated
  using (public.is_workspace_admin(workspace_id) and role <> 'owner');
create policy members_leave on public.workspace_members
  for delete to authenticated using (user_id = auth.uid() and role <> 'owner');

-- company_profiles / brand_kits: members read, admins write.
create policy company_read on public.company_profiles
  for select to authenticated using (public.is_workspace_member(workspace_id));
create policy company_write on public.company_profiles
  for update to authenticated
  using (public.is_workspace_admin(workspace_id)) with check (public.is_workspace_admin(workspace_id));

create policy brand_read on public.brand_kits
  for select to authenticated using (public.is_workspace_member(workspace_id));
create policy brand_write on public.brand_kits
  for update to authenticated
  using (public.is_workspace_admin(workspace_id)) with check (public.is_workspace_admin(workspace_id));

-- Plain tenant tables: any member can read and write; deletes need admin on clients.
create policy clients_read on public.clients
  for select to authenticated using (public.is_workspace_member(workspace_id));
create policy clients_insert on public.clients
  for insert to authenticated with check (public.is_workspace_member(workspace_id));
create policy clients_update on public.clients
  for update to authenticated
  using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy clients_delete on public.clients
  for delete to authenticated using (public.is_workspace_admin(workspace_id));

create policy projects_read on public.projects
  for select to authenticated using (public.is_workspace_member(workspace_id));
create policy projects_insert on public.projects
  for insert to authenticated with check (public.is_workspace_member(workspace_id));
create policy projects_update on public.projects
  for update to authenticated
  using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy projects_delete on public.projects
  for delete to authenticated using (public.is_workspace_admin(workspace_id));

-- Templates: system templates (workspace_id is null) are readable by everyone signed in.
create policy templates_read on public.document_templates
  for select to authenticated
  using (workspace_id is null or public.is_workspace_member(workspace_id));
create policy templates_insert on public.document_templates
  for insert to authenticated with check (workspace_id is not null and public.is_workspace_member(workspace_id));
create policy templates_update on public.document_templates
  for update to authenticated
  using (workspace_id is not null and public.is_workspace_member(workspace_id))
  with check (workspace_id is not null and public.is_workspace_member(workspace_id));
create policy templates_delete on public.document_templates
  for delete to authenticated
  using (workspace_id is not null and public.is_workspace_admin(workspace_id));

create policy documents_read on public.documents
  for select to authenticated using (public.is_workspace_member(workspace_id));
create policy documents_insert on public.documents
  for insert to authenticated with check (public.is_workspace_member(workspace_id));
create policy documents_update on public.documents
  for update to authenticated
  using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy documents_delete on public.documents
  for delete to authenticated using (public.is_workspace_admin(workspace_id));

-- Views and actions are written by the server (service role) from the public page.
-- Members may read them through the parent document's workspace.
create policy views_read on public.document_views
  for select to authenticated
  using (exists (select 1 from public.documents d
                 where d.id = document_views.document_id and public.is_workspace_member(d.workspace_id)));
create policy actions_read on public.document_actions
  for select to authenticated
  using (exists (select 1 from public.documents d
                 where d.id = document_actions.document_id and public.is_workspace_member(d.workspace_id)));

create policy packages_all on public.pricing_packages
  for all to authenticated
  using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy kb_all on public.knowledge_base_items
  for all to authenticated
  using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));

create policy ai_usage_read on public.ai_usage
  for select to authenticated using (public.is_workspace_member(workspace_id));
create policy ai_usage_insert on public.ai_usage
  for insert to authenticated
  with check (public.is_workspace_member(workspace_id) and user_id = auth.uid());

create policy subscriptions_read on public.subscriptions
  for select to authenticated using (public.is_workspace_member(workspace_id));
-- Subscription writes come only from the billing webhook via the service role.

-- ---------------------------------------------------------------------------
-- Storage: public bucket for brand assets, writes limited to the workspace folder.
-- Object path convention: {workspace_id}/{kind}-{timestamp}.{ext}
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('brand-assets', 'brand-assets', true, 2097152,
        array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])
on conflict (id) do nothing;

create policy brand_assets_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'brand-assets'
    and public.is_workspace_admin(((storage.foldername(name))[1])::uuid)
  );
create policy brand_assets_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'brand-assets'
    and public.is_workspace_admin(((storage.foldername(name))[1])::uuid)
  );
create policy brand_assets_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'brand-assets'
    and public.is_workspace_admin(((storage.foldername(name))[1])::uuid)
  );
