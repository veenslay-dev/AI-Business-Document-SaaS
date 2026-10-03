-- Per-page SEO and content overrides for the public pages, edited from the admin panel.
-- Read and written by the server only (service role). Safe to run more than once.
create table if not exists public.site_pages (
  path text primary key,
  seo_title text,
  seo_description text,
  og_image text,
  robots text check (robots in ('index', 'noindex')),
  canonical text,
  heading text,
  intro text,
  extra_md text,
  schema_json text,
  updated_at timestamptz not null default now()
);
alter table public.site_pages enable row level security;
revoke all on public.site_pages from anon, authenticated;
