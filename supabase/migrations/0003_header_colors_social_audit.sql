-- Separate header and heading colors in the brand kit, and a manual social media audit document type.

-- NULL means "derive automatically from the primary color", so existing workspaces keep working.
alter table public.brand_kits
  add column if not exists header_color text,
  add column if not exists heading_color text;

alter table public.brand_kits
  add constraint brand_header_color_hex check (header_color is null or header_color ~ '^#[0-9a-fA-F]{6}$'),
  add constraint brand_heading_color_hex check (heading_color is null or heading_color ~ '^#[0-9a-fA-F]{6}$');

alter type public.document_type add value if not exists 'social_audit';

-- "audits" now counts SEO and social media audits. Compared as text so this script
-- can add the enum value and refer to it without waiting for a commit.
create or replace function public.dashboard_stats(ws uuid)
returns jsonb language sql stable security invoker set search_path = public as $$
  select jsonb_build_object(
    'total', count(*),
    'proposals', count(*) filter (where type::text = 'proposal'),
    'quotations', count(*) filter (where type::text = 'quotation'),
    'audits', count(*) filter (where type::text in ('seo_audit', 'social_audit')),
    'accepted_proposals', count(*) filter (where type::text = 'proposal' and status = 'accepted'),
    'quotation_value', coalesce((
      select jsonb_object_agg(currency, total) from (
        select coalesce(currency, 'INR') as currency, sum(total_amount) as total
        from public.documents
        where workspace_id = ws and type::text = 'quotation' and total_amount is not null
        group by 1
      ) q
    ), '{}'::jsonb)
  )
  from public.documents where workspace_id = ws;
$$;
grant execute on function public.dashboard_stats(uuid) to authenticated;
