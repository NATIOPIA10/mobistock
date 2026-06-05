-- ================================================================
-- DATABASE REPAIR: Fix store_settings sequence, backfill, and RLS
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- ================================================================

-- 1. Fix the primary key sequence for store_settings table
-- (Explicit inserts/restores bypass sequence progression, causing duplicate key errors)
SELECT setval('public.store_settings_id_seq', COALESCE((SELECT MAX(id)+1 FROM public.store_settings), 1), false);

-- 2. Clean up duplicate, conflicting or corrupted RLS policies on store_settings
DROP POLICY IF EXISTS "Users can view own settings" ON public.store_settings;
DROP POLICY IF EXISTS "Users can view own store settings" ON public.store_settings;
DROP POLICY IF EXISTS "Users can insert own settings" ON public.store_settings;
DROP POLICY IF EXISTS "Users can insert own store settings" ON public.store_settings;
DROP POLICY IF EXISTS "Users can update own settings" ON public.store_settings;
DROP POLICY IF EXISTS "Users can update own store settings" ON public.store_settings;
DROP POLICY IF EXISTS "Users can delete own settings" ON public.store_settings;
DROP POLICY IF EXISTS "Users can delete own store settings" ON public.store_settings;

-- 3. Recreate clean, explicit RLS policies for store_settings based on owner_id
CREATE POLICY "Users can view own store settings"
  ON public.store_settings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own store settings"
  ON public.store_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own store settings"
  ON public.store_settings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can delete own store settings"
  ON public.store_settings
  FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- 4. Backfill default store_settings for any user who registered but doesn't have a settings row
INSERT INTO public.store_settings (
  owner_id,
  store_name,
  email,
  phone,
  address,
  currency,
  tax_rate,
  timezone,
  discount_options,
  exchange_rate,
  product_categories,
  notify_email,
  notify_low_stock,
  notify_daily_report,
  low_stock_threshold
)
SELECT
  up.id,
  'My Store',
  up.email,
  '',
  '',
  'ETB',
  15,
  'Africa/Addis_Ababa',
  '0,5,10,15,20',
  1,
  'Smartphones, Tablets, Wearables, Accessories, Gaming',
  true,
  true,
  false,
  10
FROM public.user_profiles up
LEFT JOIN public.store_settings ss ON ss.owner_id = up.id
WHERE ss.id IS NULL
ON CONFLICT (owner_id) DO NOTHING;

-- 5. Restore handle_new_user() trigger function to automatically create settings for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  is_first boolean;
BEGIN
  -- Check if this is the very first user ever registered
  SELECT NOT EXISTS (SELECT 1 FROM public.user_profiles) INTO is_first;

  -- Create user profile row
  INSERT INTO public.user_profiles (id, email, approved, is_superadmin)
  VALUES (
    new.id,
    new.email,
    is_first,
    false
  )
  ON CONFLICT (id) DO NOTHING;

  -- Create blank store settings for new user
  INSERT INTO public.store_settings (
    owner_id,
    store_name,
    email,
    phone,
    address,
    currency,
    tax_rate,
    timezone,
    discount_options,
    exchange_rate,
    product_categories,
    notify_email,
    notify_low_stock,
    notify_daily_report,
    low_stock_threshold
  )
  VALUES (
    new.id,
    'My Store',
    new.email,
    '',
    '',
    'ETB',
    15,
    'Africa/Addis_Ababa',
    '0,5,10,15,20',
    1,
    'Smartphones, Tablets, Wearables, Accessories, Gaming',
    true,
    true,
    false,
    10
  )
  ON CONFLICT (owner_id) DO NOTHING;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Rebuild trigger binding
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
