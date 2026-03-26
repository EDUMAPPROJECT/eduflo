-- Edge Function에서 Admin API와 동일 DB의 auth.users 존재 여부를 비교하기 위한 진단용 RPC
-- service_role만 실행 (클라이언트 anon 키로는 호출 불가)

create or replace function public.auth_user_exists(p_user_id uuid)
returns boolean
language sql
security definer
set search_path = auth
stable
as $$
  select exists(select 1 from auth.users where id = p_user_id);
$$;

revoke all on function public.auth_user_exists(uuid) from public;
grant execute on function public.auth_user_exists(uuid) to service_role;
