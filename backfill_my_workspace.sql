-- ============================================================
-- One-time backfill: creates a real organization + workspace for
-- YOUR account specifically, and a membership row linking you to it
-- as owner. Safe to run multiple times (won't create duplicates).
-- ============================================================

-- Step 1: find your own user id (from your login email)
-- Replace 'you@example.com' with the actual email you log in with.
select id, email from auth.users where email = 'you@example.com';

-- Step 2: once you have your user id from Step 1, replace
-- YOUR_USER_ID_HERE below (in ALL THREE places) and run this block.
do $$
declare
  v_user_id uuid := 'YOUR_USER_ID_HERE'; -- paste your real id here
  v_org_id uuid;
  v_workspace_id uuid;
begin
  -- Only create if this user doesn't already have a workspace
  if not exists (select 1 from workspace_members where user_id = v_user_id) then
    insert into organizations (name, slug) values ('My Organization', 'org-' || substr(v_user_id::text, 1, 8))
      returning id into v_org_id;

    insert into workspaces (organization_id, name) values (v_org_id, 'My Workspace')
      returning id into v_workspace_id;

    insert into workspace_members (workspace_id, user_id, role) values (v_workspace_id, v_user_id, 'owner');

    raise notice 'Created workspace % for user %', v_workspace_id, v_user_id;
  else
    raise notice 'User % already has a workspace, nothing created', v_user_id;
  end if;
end $$;

-- Step 3: confirm it worked
select w.id as workspace_id, w.name, wm.role
from workspaces w
join workspace_members wm on wm.workspace_id = w.id
where wm.user_id = 'YOUR_USER_ID_HERE'; -- same id as above
