-- Invoices as their own document type (quotations stay a scope-of-work document).
alter type public.document_type add value if not exists 'invoice';

-- Dashboard: audits count SEO and social audits; total documents already covers invoices.
create or replace function public.dashboard_stats(ws uuid)
returns jsonb language sql stable security invoker set search_path = public as $$
  select jsonb_build_object(
    'total', count(*),
    'proposals', count(*) filter (where type::text = 'proposal'),
    'quotations', count(*) filter (where type::text = 'quotation'),
    'invoices', count(*) filter (where type::text = 'invoice'),
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
