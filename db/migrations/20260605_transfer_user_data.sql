-- ================================================================
-- DATA TRANSFER: natnaeltsedeke7@gmail.com → natnaeltsedeke63@gmail.com
--
-- This script transfers ALL store data (settings, products, orders,
-- variants, etc.) from the old account to the new account.
--
-- HOW TO RUN:
--   Supabase Dashboard → SQL Editor → New Query → Paste → Run
-- ================================================================

-- Step 1: Capture both user IDs into variables
DO $$
DECLARE
  old_uid  uuid;
  new_uid  uuid;
BEGIN

  -- Get the old user's UUID
  SELECT id INTO old_uid
  FROM auth.users
  WHERE email = 'natnaeltsedeke7@gmail.com'
  LIMIT 1;

  -- Get the new user's UUID
  SELECT id INTO new_uid
  FROM auth.users
  WHERE email = 'natnaeltsedeke63@gmail.com'
  LIMIT 1;

  -- Safety check: both accounts must exist
  IF old_uid IS NULL THEN
    RAISE EXCEPTION 'Old user natnaeltsedeke7@gmail.com not found in auth.users';
  END IF;

  IF new_uid IS NULL THEN
    RAISE EXCEPTION 'New user natnaeltsedeke63@gmail.com not found in auth.users. They must sign up first.';
  END IF;

  RAISE NOTICE 'Transferring data from % → %', old_uid, new_uid;

  -- ----------------------------------------------------------------
  -- 2. Transfer store_settings ownership
  -- ----------------------------------------------------------------
  -- Safety: If the new user already has a blank/default store_settings row,
  -- delete it first to avoid unique key constraint violation when updating the old row's owner.
  DELETE FROM public.store_settings
  WHERE owner_id = new_uid;

  UPDATE public.store_settings
  SET owner_id = new_uid, email = 'natnaeltsedeke63@gmail.com'
  WHERE owner_id = old_uid;

  RAISE NOTICE 'store_settings transferred: % rows', FOUND::int;

  -- ----------------------------------------------------------------
  -- 3. Transfer products ownership
  -- ----------------------------------------------------------------
  UPDATE public.products
  SET owner_id = new_uid
  WHERE owner_id = old_uid;

  RAISE NOTICE 'products transferred';

  -- ----------------------------------------------------------------
  -- 4. Transfer orders ownership
  -- ----------------------------------------------------------------
  UPDATE public.orders
  SET owner_id = new_uid
  WHERE owner_id = old_uid;

  RAISE NOTICE 'orders transferred';

  -- ----------------------------------------------------------------
  -- 5. Transfer any other tables that use owner_id
  -- ----------------------------------------------------------------

  -- quick_sales (if exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'quick_sales'
  ) THEN
    EXECUTE 'UPDATE public.quick_sales SET owner_id = $1 WHERE owner_id = $2'
    USING new_uid, old_uid;
    RAISE NOTICE 'quick_sales transferred';
  END IF;

  -- notifications (if exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'notifications'
  ) THEN
    EXECUTE 'UPDATE public.notifications SET owner_id = $1 WHERE owner_id = $2'
    USING new_uid, old_uid;
    RAISE NOTICE 'notifications transferred';
  END IF;

  -- security_logs (if has owner_id)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'security_logs'
      AND column_name = 'owner_id'
  ) THEN
    EXECUTE 'UPDATE public.security_logs SET owner_id = $1 WHERE owner_id = $2'
    USING new_uid, old_uid;
    RAISE NOTICE 'security_logs transferred';
  END IF;

  -- ----------------------------------------------------------------
  -- 6. Copy profile data (approved status) to new user's profile
  --    then delete old profile
  -- ----------------------------------------------------------------
  UPDATE public.user_profiles
  SET
    approved     = (SELECT approved FROM public.user_profiles WHERE id = old_uid),
    is_superadmin = false
  WHERE id = new_uid;

  -- Remove old profile (auth user remains, just no profile row)
  DELETE FROM public.user_profiles
  WHERE id = old_uid;

  RAISE NOTICE 'user_profiles updated: old profile removed, new profile inherits approved status';

  RAISE NOTICE '✅ Transfer complete!';

END $$;


-- ================================================================
-- Verify: Show all remaining user profiles
-- ================================================================
SELECT
  up.id,
  up.email,
  up.approved,
  up.is_superadmin,
  up.created_at,
  (SELECT COUNT(*) FROM public.store_settings ss WHERE ss.owner_id = up.id) AS store_settings_count,
  (SELECT COUNT(*) FROM public.products p WHERE p.owner_id = up.id) AS products_count,
  (SELECT COUNT(*) FROM public.orders o WHERE o.owner_id = up.id) AS orders_count
FROM public.user_profiles up
ORDER BY up.created_at ASC;
