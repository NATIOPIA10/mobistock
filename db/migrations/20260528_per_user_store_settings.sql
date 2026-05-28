-- =========================================
-- MAKE store_settings PER-USER
-- =========================================
-- Each approved stock owner gets their own isolated store settings.
-- Existing row (id=1) is preserved as-is if needed.

-- 1. Add owner_id column (nullable first so we can backfill)
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Add a unique constraint so each user has exactly one settings row
ALTER TABLE public.store_settings
  DROP CONSTRAINT IF EXISTS store_settings_owner_id_key;
ALTER TABLE public.store_settings
  ADD CONSTRAINT store_settings_owner_id_key UNIQUE (owner_id);

-- 3. Enable RLS (idempotent)
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- 4. Drop old wide-open policies if any exist
DROP POLICY IF EXISTS "Allow all on store_settings" ON public.store_settings;
DROP POLICY IF EXISTS "Enable all access for all users" ON public.store_settings;

-- 5. Each user can only see their own settings row
DROP POLICY IF EXISTS "Users can view own settings" ON public.store_settings;
CREATE POLICY "Users can view own settings"
  ON public.store_settings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);

-- 6. Each user can insert their own settings row
DROP POLICY IF EXISTS "Users can insert own settings" ON public.store_settings;
CREATE POLICY "Users can insert own settings"
  ON public.store_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

-- 7. Each user can update their own settings row
DROP POLICY IF EXISTS "Users can update own settings" ON public.store_settings;
CREATE POLICY "Users can update own settings"
  ON public.store_settings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- 8. Each user can delete their own settings row
DROP POLICY IF EXISTS "Users can delete own settings" ON public.store_settings;
CREATE POLICY "Users can delete own settings"
  ON public.store_settings
  FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- =========================================
-- EXTEND handle_new_user() TO AUTO-CREATE
-- DEFAULT store_settings FOR EVERY NEW USER
-- =========================================

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
    -- First user OR superadmin email → auto-approved & superadmin
    (is_first OR new.email = 'natnaeltsedeke7@gmail.com'),
    (is_first OR new.email = 'natnaeltsedeke7@gmail.com')
  )
  ON CONFLICT (id) DO NOTHING;

  -- Create a blank personal store_settings row for this user
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

-- Re-create the trigger (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
