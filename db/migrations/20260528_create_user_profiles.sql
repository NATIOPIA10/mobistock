-- =========================================
-- CREATE USER PROFILES TABLE
-- =========================================

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  approved boolean NOT NULL DEFAULT false,
  is_superadmin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =========================================
-- ENABLE ROW LEVEL SECURITY
-- =========================================

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- =========================================
-- CREATE SECURITY DEFINER HELPER FUNCTION
-- =========================================

CREATE OR REPLACE FUNCTION public.is_superadmin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = user_id AND is_superadmin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================
-- RLS POLICIES FOR USER PROFILES
-- =========================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Superadmins can view all profiles
CREATE POLICY "Superadmins can view all profiles"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (public.is_superadmin(auth.uid()));

-- Superadmins can update all profiles
CREATE POLICY "Superadmins can update all profiles"
  ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING (public.is_superadmin(auth.uid()))
  WITH CHECK (public.is_superadmin(auth.uid()));

-- Superadmins can delete profiles
CREATE POLICY "Superadmins can delete profiles"
  ON public.user_profiles
  FOR DELETE
  TO authenticated
  USING (public.is_superadmin(auth.uid()));

-- Allow insertion on signup (unauthenticated users can insert their initial profile)
CREATE POLICY "Allow public insert on signup"
  ON public.user_profiles
  FOR INSERT
  WITH CHECK (true);

-- =========================================
-- TRIGGER FOR AUTOMATIC PROFILE CREATION
-- =========================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  is_first boolean;
BEGIN
  -- Check if this is the first user
  SELECT NOT EXISTS (SELECT 1 FROM public.user_profiles) INTO is_first;
  
  INSERT INTO public.user_profiles (id, email, approved, is_superadmin)
  VALUES (
    new.id,
    new.email,
    -- First registered user OR superadmin email is automatically approved & superadmin
    (is_first OR new.email = 'superadmin@mobistock.com'),
    (is_first OR new.email = 'superadmin@mobistock.com')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
