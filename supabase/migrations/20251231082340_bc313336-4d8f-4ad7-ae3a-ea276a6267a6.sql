-- 1) Ensure user_roles has exactly one role per user (using DO block for conditional)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_user_id_unique'
  ) THEN
    ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_unique UNIQUE (user_id);
  END IF;
END $$;

-- 2) Backfill missing roles for existing users using their signup metadata
INSERT INTO public.user_roles (user_id, role)
SELECT
  u.id,
  COALESCE((u.raw_user_meta_data ->> 'role')::public.app_role, 'parent'::public.app_role)
FROM auth.users u
LEFT JOIN public.user_roles ur
  ON ur.user_id = u.id
WHERE ur.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;