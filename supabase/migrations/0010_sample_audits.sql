-- The real audit of our own website that the SEO Audit Report Generator page shows as its sample.
-- Written and read by the server only (service role). Safe to run more than once.
create table if not exists public.sample_audits (
  key text primary key,
  url text not null,
  scanned_at timestamptz not null,
  signals jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.sample_audits enable row level security;
revoke all on public.sample_audits from anon, authenticated;
