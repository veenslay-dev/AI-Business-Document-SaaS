-- Lets the platform admin create a workspace for any user (used when the admin adds a user by hand).
-- Server (service role) only. Safe to run more than once.
create or replace function public.admin_create_workspace(p_owner uuid, p_name text, p_slug text)
returns uuid language plpgsql security definer set search_path = public as $$
declare ws uuid;
begin
  if length(trim(p_name)) = 0 then raise exception 'workspace name required'; end if;
  insert into public.workspaces (name, slug) values (trim(p_name), p_slug) returning id into ws;
  insert into public.workspace_members (workspace_id, user_id, role) values (ws, p_owner, 'owner');
  insert into public.company_profiles (workspace_id, company_name) values (ws, trim(p_name));
  insert into public.brand_kits (workspace_id) values (ws);
  insert into public.subscriptions (workspace_id) values (ws);
  return ws;
end;
$$;
revoke all on function public.admin_create_workspace(uuid, text, text) from public, anon, authenticated;
grant execute on function public.admin_create_workspace(uuid, text, text) to service_role;
