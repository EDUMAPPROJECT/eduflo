-- Reassign app user UUID across public tables (admin recovery)
-- Used when legacy auth users are corrupted and we must create a new auth user.

create or replace function public.reassign_user_uuid(p_old uuid, p_new uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  updated_count bigint;
  result jsonb := '{}'::jsonb;
begin
  if p_old is null or p_new is null then
    raise exception 'old/new uuid must not be null';
  end if;
  if p_old = p_new then
    return jsonb_build_object('ok', true, 'note', 'same uuid');
  end if;

  -- 1) profiles.id (primary key) must move first
  update public.profiles set id = p_new where id = p_old;
  get diagnostics updated_count = row_count;
  result := result || jsonb_build_object('profiles.id', updated_count);

  -- 2) user_roles.user_id
  update public.user_roles set user_id = p_new where user_id = p_old;
  get diagnostics updated_count = row_count;
  result := result || jsonb_build_object('user_roles.user_id', updated_count);

  -- 3) Best-effort: update common foreign key columns across public schema.
  for r in
    select table_name, column_name
    from information_schema.columns
    where table_schema = 'public'
      and data_type = 'uuid'
      and column_name in (
        'user_id',
        'author_id',
        'student_id',
        'parent_id',
        'admin_id',
        'blocked_user_id',
        'blocker_id',
        'sender_id',
        'receiver_id',
        'created_by',
        'updated_by'
      )
      and not (table_name = 'profiles' and column_name = 'id')
      and not (table_name = 'user_roles' and column_name = 'user_id')
  loop
    execute format(
      'update public.%I set %I = $1 where %I = $2',
      r.table_name,
      r.column_name,
      r.column_name
    )
    using p_new, p_old;
    get diagnostics updated_count = row_count;
    if updated_count > 0 then
      result := result || jsonb_build_object(r.table_name || '.' || r.column_name, updated_count);
    end if;
  end loop;

  return jsonb_build_object('ok', true, 'updates', result);
end;
$$;

revoke all on function public.reassign_user_uuid(uuid, uuid) from public;
grant execute on function public.reassign_user_uuid(uuid, uuid) to service_role;