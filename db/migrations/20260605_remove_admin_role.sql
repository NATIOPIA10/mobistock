-- ================================================================
-- MIGRATION: Remove admin role, unify all users as store owners
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ================================================================

-- ----------------------------------------------------------------
-- 1. Update the handle_new_user trigger function
--    - All new signups are store owners (no superadmin logic)
--    - First registered user is auto-approved
--    - All subsequent users start as pending (need approval)
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  is_first boolean;
BEGIN
  -- Check if this is the very first user ever registered
  SELECT NOT EXISTS (SELECT 1 FROM public.user_profiles) INTO is_first;

  INSERT INTO public.user_profiles (id, email, approved, is_superadmin)
  VALUES (
    new.id,
    new.email,
    -- First user is auto-approved so they can approve others
    -- All others start as pending
    is_first,
    -- No one gets superadmin via signup anymore
    false
  );

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ----------------------------------------------------------------
-- 2. Make sure the trigger is correctly attached
--    (safe to run even if it already exists)
-- ----------------------------------------------------------------
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- ----------------------------------------------------------------
-- 3. Fix any existing users who signed up with is_superadmin=true
--    — demote them to regular owners but keep them approved
--    so they don't lose access
-- ----------------------------------------------------------------
UPDATE public.user_profiles
SET is_superadmin = false
WHERE is_superadmin = true;


-- ----------------------------------------------------------------
-- 4. Verify the result
-- ----------------------------------------------------------------
SELECT
  id,
  email,
  approved,
  is_superadmin,
  created_at
FROM public.user_profiles
ORDER BY created_at ASC;
