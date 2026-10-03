-- Workspace isolation tests. Each assertion raises an exception on failure.
\set ON_ERROR_STOP on

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'alice@a.test'),
  ('00000000-0000-0000-0000-00000000000b', 'bob@b.test'),
  ('00000000-0000-0000-0000-00000000000c', 'carol@a.test');

create function pg_temp.as_user(u text) returns void language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claim.sub', u, false);
  set role authenticated;
end $$;
grant execute on function pg_temp.as_user(text) to public;

-- Alice creates workspace A, Bob creates workspace B via the RPC.
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select public.create_workspace('Alpha Co', 'alpha') as ws_a \gset
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select public.create_workspace('Beta Co', 'beta') as ws_b \gset

select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
insert into public.clients (workspace_id, company_name) values (:'ws_a', 'Alpha Client') returning id as client_a \gset
insert into public.documents (workspace_id, client_id, type, title)
  values (:'ws_a', :'client_a', 'proposal', 'Alpha Proposal') returning id as doc_a \gset

select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
insert into public.clients (workspace_id, company_name) values (:'ws_b', 'Beta Client') returning id as client_b \gset

reset role;
select set_config('app.ws_a', :'ws_a', false), set_config('app.ws_b', :'ws_b', false),
       set_config('app.client_a', :'client_a', false), set_config('app.client_b', :'client_b', false),
       set_config('app.doc_a', :'doc_a', false) \gset

-- 1. Bob cannot read Alice's data.
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
do $$
declare n int;
begin
  select count(*) into n from public.clients where company_name = 'Alpha Client';
  if n <> 0 then raise exception 'FAIL: Bob can read Alice client'; end if;
  select count(*) into n from public.documents;
  if n <> 0 then raise exception 'FAIL: Bob can read Alice documents'; end if;
  select count(*) into n from public.workspaces;
  if n <> 1 then raise exception 'FAIL: Bob sees % workspaces', n; end if;
  select count(*) into n from public.company_profiles;
  if n <> 1 then raise exception 'FAIL: Bob sees % company profiles', n; end if;
  select count(*) into n from public.brand_kits;
  if n <> 1 then raise exception 'FAIL: Bob sees % brand kits', n; end if;
  select count(*) into n from public.workspace_members;
  if n <> 1 then raise exception 'FAIL: Bob sees % member rows', n; end if;
  select count(*) into n from public.subscriptions;
  if n <> 1 then raise exception 'FAIL: Bob sees % subscriptions', n; end if;
end $$;

-- 2. Bob cannot insert into Alice's workspace.
do $$
begin
  begin
    insert into public.clients (workspace_id, company_name)
    values (current_setting('app.ws_a')::uuid, 'intruder');
    raise exception 'FAIL: Bob inserted a client into workspace A';
  exception when others then
    if sqlerrm like 'FAIL:%' then raise; end if;
  end;
  begin
    insert into public.documents (workspace_id, type, title)
    values (current_setting('app.ws_a')::uuid, 'proposal', 'intruder');
    raise exception 'FAIL: Bob inserted a document into workspace A';
  exception when others then
    if sqlerrm like 'FAIL:%' then raise; end if;
  end;
end $$;

-- 3. Bob's updates and deletes against Alice's rows affect nothing.
do $$
declare n int;
begin
  update public.clients set company_name = 'hacked' where id = current_setting('app.client_a')::uuid;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: Bob updated Alice client'; end if;
  delete from public.documents where id = current_setting('app.doc_a')::uuid;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: Bob deleted Alice document'; end if;
  update public.brand_kits set primary_color = '#000000' where workspace_id = current_setting('app.ws_a')::uuid;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: Bob updated Alice brand kit'; end if;
end $$;

-- 4. Bob cannot add himself to Alice's workspace.
do $$
begin
  begin
    insert into public.workspace_members (workspace_id, user_id, role)
    values (current_setting('app.ws_a')::uuid, '00000000-0000-0000-0000-00000000000b', 'admin');
    raise exception 'FAIL: Bob joined workspace A';
  exception when others then
    if sqlerrm like 'FAIL:%' then raise; end if;
  end;
end $$;

-- 5. A document cannot point at a client from another workspace (composite FK).
do $$
begin
  begin
    insert into public.documents (workspace_id, client_id, type, title)
    values (current_setting('app.ws_b')::uuid, current_setting('app.client_a')::uuid, 'proposal', 'cross');
    raise exception 'FAIL: cross-workspace client link allowed';
  exception when foreign_key_violation then
    null;
  end;
end $$;

-- 6. Owner adds Carol as a plain member; roles are enforced.
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
insert into public.workspace_members (workspace_id, user_id, role)
values (:'ws_a', '00000000-0000-0000-0000-00000000000c', 'member');

select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
do $$
declare n int;
begin
  select count(*) into n from public.clients where workspace_id = current_setting('app.ws_a')::uuid;
  if n <> 1 then raise exception 'FAIL: member cannot read workspace clients'; end if;
  -- members can create documents
  insert into public.clients (workspace_id, company_name) values (current_setting('app.ws_a')::uuid, 'By Carol');
  -- members cannot edit the brand kit or company profile
  update public.brand_kits set primary_color = '#111111' where workspace_id = current_setting('app.ws_a')::uuid;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: member edited brand kit'; end if;
  update public.company_profiles set phone = '1' where workspace_id = current_setting('app.ws_a')::uuid;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: member edited company profile'; end if;
  -- members cannot delete clients or manage the team
  delete from public.clients where workspace_id = current_setting('app.ws_a')::uuid;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: member deleted clients'; end if;
  begin
    update public.workspace_members set role = 'admin'
    where user_id = '00000000-0000-0000-0000-00000000000c';
    get diagnostics n = row_count;
    if n <> 0 then raise exception 'FAIL: member promoted themselves'; end if;
  end;
end $$;

-- 7. Owner can edit the brand kit; owner row cannot be removed by an admin path.
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
do $$
declare n int;
begin
  update public.brand_kits set primary_color = '#123456' where workspace_id = current_setting('app.ws_a')::uuid;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: owner cannot edit brand kit'; end if;
  delete from public.workspace_members
  where user_id = '00000000-0000-0000-0000-00000000000a' and workspace_id = current_setting('app.ws_a')::uuid;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: owner membership deletable'; end if;
end $$;

-- 8. Anonymous users see nothing and cannot create workspaces.
reset role;
set role anon;
do $$
declare n int;
begin
  select count(*) into n from public.documents;
  if n <> 0 then raise exception 'FAIL: anon reads documents'; end if;
  begin
    perform public.create_workspace('anon', 'anon');
    raise exception 'FAIL: anon created workspace';
  exception when insufficient_privilege then
    null;
  end;
end $$;
reset role;

-- 9. Stats view, dashboard_stats and invites respect tenancy.
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
insert into public.documents (workspace_id, client_id, type, title, status, total_amount, currency)
  values (:'ws_a', :'client_a', 'quotation', 'Q1', 'sent', 1500, 'INR');
insert into public.documents (workspace_id, client_id, type, title, status)
  values (:'ws_a', :'client_a', 'proposal', 'P1', 'accepted');
do $$
declare s jsonb;
begin
  s := public.dashboard_stats(current_setting('app.ws_a')::uuid);
  if (s->>'total')::int <> 3 then raise exception 'FAIL: stats total %', s; end if;
  if (s->>'accepted_proposals')::int <> 1 then raise exception 'FAIL: accepted proposals %', s; end if;
  if (s->'quotation_value'->>'INR')::numeric <> 1500 then raise exception 'FAIL: quotation value %', s; end if;
  insert into public.workspace_invites (workspace_id, email, role) values (current_setting('app.ws_a')::uuid, 'new@a.test', 'member');
end $$;

select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
do $$
declare s jsonb; n int;
begin
  s := public.dashboard_stats(current_setting('app.ws_a')::uuid);
  if (s->>'total')::int <> 0 then raise exception 'FAIL: Bob sees Alice stats %', s; end if;
  select count(*) into n from public.document_stats;
  if n <> 0 then raise exception 'FAIL: Bob sees Alice document_stats'; end if;
  select count(*) into n from public.workspace_invites;
  if n <> 0 then raise exception 'FAIL: Bob sees Alice invites'; end if;
end $$;

-- Carol (member) cannot read or create invites.
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
do $$
declare n int;
begin
  select count(*) into n from public.workspace_invites;
  if n <> 0 then raise exception 'FAIL: member sees invites'; end if;
  begin
    insert into public.workspace_invites (workspace_id, email) values (current_setting('app.ws_a')::uuid, 'x@x.test');
    raise exception 'FAIL: member created invite';
  exception when others then
    if sqlerrm like 'FAIL:%' then raise; end if;
  end;
end $$;
reset role;

-- 10. Social audits are tenant data too, and count as audits in the dashboard.
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
insert into public.documents (workspace_id, client_id, type, title) values (:'ws_a', :'client_a', 'social_audit', 'Social audit');
do $$
declare s jsonb;
begin
  s := public.dashboard_stats(current_setting('app.ws_a')::uuid);
  if (s->>'audits')::int <> 1 then raise exception 'FAIL: audits should count social audits %', s; end if;
  update public.brand_kits set header_color = '#112233', heading_color = null where workspace_id = current_setting('app.ws_a')::uuid;
  begin
    update public.brand_kits set header_color = 'red' where workspace_id = current_setting('app.ws_a')::uuid;
    raise exception 'FAIL: bad header color accepted';
  exception when check_violation then null;
  end;
end $$;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
do $$
declare n int;
begin
  select count(*) into n from public.documents where type::text = 'social_audit';
  if n <> 0 then raise exception 'FAIL: Bob sees Alice social audit'; end if;
end $$;
reset role;

-- 11. Invoices are tenant data too.
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
insert into public.documents (workspace_id, client_id, type, title, total_amount, currency) values (:'ws_a', :'client_a', 'invoice', 'Invoice 1', 500, 'INR');
do $$
declare s jsonb;
begin
  s := public.dashboard_stats(current_setting('app.ws_a')::uuid);
  if (s->>'invoices')::int <> 1 then raise exception 'FAIL: invoice count %', s; end if;
end $$;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
do $$
declare n int;
begin
  select count(*) into n from public.documents where type::text = 'invoice';
  if n <> 0 then raise exception 'FAIL: Bob sees Alice invoice'; end if;
end $$;
reset role;

-- 12. Contact messages and admin helpers are not reachable by signed-in users.
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
do $$
begin
  begin
    perform 1 from public.contact_messages;
    raise exception 'FAIL: contact_messages readable by a user';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.platform_first_user_id();
    raise exception 'FAIL: platform_first_user_id callable by a user';
  exception when insufficient_privilege then null;
  end;
  begin
    perform * from public.admin_workspaces();
    raise exception 'FAIL: admin_workspaces callable by a user';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
do $$
declare n int;
begin
  perform public.platform_first_user_id();
  select count(*) into n from public.admin_workspaces();
  if n < 2 then raise exception 'FAIL: admin_workspaces returned % rows', n; end if;
end $$;

-- 13. The admin workspace creator is not callable by signed-in users, and works for the service role.
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
do $$
begin
  begin
    perform public.admin_create_workspace('00000000-0000-0000-0000-00000000000a', 'X', 'x-slug');
    raise exception 'FAIL: admin_create_workspace callable by a user';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
do $$
declare ws uuid; n int;
begin
  ws := public.admin_create_workspace('00000000-0000-0000-0000-00000000000a', 'Admin made', 'admin-made-slug');
  select count(*) into n from public.subscriptions where workspace_id = ws and plan = 'free';
  if n <> 1 then raise exception 'FAIL: admin created workspace has no free subscription'; end if;
  select count(*) into n from public.workspace_members where workspace_id = ws and role = 'owner';
  if n <> 1 then raise exception 'FAIL: admin created workspace has no owner'; end if;
end $$;

-- 14. The admin stays pinned to the first account, even if it is deleted.
do $$
declare first_id uuid; again uuid; other uuid;
begin
  first_id := public.platform_first_user_id();
  again := public.platform_first_user_id();
  if first_id is null or first_id <> again then raise exception 'FAIL: admin id not stable'; end if;
  select id into other from auth.users where id <> first_id limit 1;
  delete from public.workspace_members where user_id = first_id;
  delete from auth.users where id = first_id;
  if public.platform_first_user_id() is not null then raise exception 'FAIL: admin role passed to another account'; end if;
end $$;

-- 15. AI usage totals for the admin cost pages work for the service role only.
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
do $$
begin
  begin
    perform * from public.admin_ai_usage();
    raise exception 'FAIL: admin_ai_usage callable by a user';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
do $$
begin
  perform * from public.admin_ai_usage(now() - interval '30 days', now());
end $$;

-- 16. Payments: members read only their own workspace's rows and can never write them.
insert into public.payments (workspace_id, plan, period, amount_paise, razorpay_order_id, status) values (:'ws_a', 'professional', 'monthly', 99900, 'order_rls_1', 'paid');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
do $$
declare n int;
begin
  select count(*) into n from public.payments;
  if n <> 1 then raise exception 'FAIL: Carol sees % payments', n; end if;
  begin
    insert into public.payments (workspace_id, plan, period, amount_paise, razorpay_order_id) values (current_setting('app.ws_a')::uuid, 'agency', 'yearly', 1, 'order_rls_x');
    raise exception 'FAIL: a member inserted a payment';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.payments set status = 'paid';
    raise exception 'FAIL: a member updated a payment';
  exception when insufficient_privilege then null;
  end;
end $$;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
do $$
declare n int;
begin
  select count(*) into n from public.payments;
  if n <> 0 then raise exception 'FAIL: Bob sees Carol payments'; end if;
end $$;
reset role;

-- 17. Site page overrides: no signed-in or anonymous access at all, only the server.
reset role;
insert into public.site_pages (path, seo_title) values ('/about', 'Hidden from users');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
do $$
begin
  begin
    perform 1 from public.site_pages;
    raise exception 'FAIL: a member read site_pages';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.site_pages (path) values ('/x');
    raise exception 'FAIL: a member wrote site_pages';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
