-- Create announcements table for platform-wide announcements
CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  is_active boolean DEFAULT true,
  priority integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Super admins can do everything
CREATE POLICY "Super admins can manage announcements"
ON public.announcements
FOR ALL
USING (is_super_admin(auth.uid()));

-- Everyone can view active announcements
CREATE POLICY "Anyone can view active announcements"
ON public.announcements
FOR SELECT
USING (is_active = true);

-- Create trigger for updated_at
CREATE TRIGGER update_announcements_updated_at
BEFORE UPDATE ON public.announcements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create platform_settings table for system configuration
CREATE TABLE public.platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL DEFAULT '{}',
  description text,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Super admins can manage settings
CREATE POLICY "Super admins can manage platform settings"
ON public.platform_settings
FOR ALL
USING (is_super_admin(auth.uid()));

-- Everyone can view settings (for app configuration)
CREATE POLICY "Anyone can view platform settings"
ON public.platform_settings
FOR SELECT
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_platform_settings_updated_at
BEFORE UPDATE ON public.platform_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add RLS policy for super admins to view all user_roles for user management
CREATE POLICY "Super admins can view all user roles"
ON public.user_roles
FOR SELECT
USING (is_super_admin(auth.uid()));

-- Add RLS policy for super admins to update user roles
CREATE POLICY "Super admins can update user roles"
ON public.user_roles
FOR UPDATE
USING (is_super_admin(auth.uid()));

-- Add RLS policy for super admins to view all profiles
CREATE POLICY "Super admins can view all profiles"
ON public.profiles
FOR SELECT
USING (is_super_admin(auth.uid()));