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
