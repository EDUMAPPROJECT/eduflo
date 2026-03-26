alter table public.user_roles
add column if not exists require_password_change boolean not null default false;
