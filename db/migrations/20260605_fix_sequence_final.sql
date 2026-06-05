-- ================================================================
-- FINAL FIX: Sync store_settings primary key sequence
-- Run this in: Supabase Dashboard → SQL Editor → Run
-- ================================================================

-- Step 1: Set the sequence to safely above the current MAX id
-- Adding 1000 as a buffer so new inserts never collide
SELECT setval(
  pg_get_serial_sequence('public.store_settings', 'id'),
  COALESCE((SELECT MAX(id) FROM public.store_settings), 0) + 1000,
  false  -- false = next call to nextval() returns this exact value
);

-- Step 2: Verify the fix worked (should return a value > MAX id)
SELECT
  last_value AS sequence_current_value,
  (SELECT MAX(id) FROM public.store_settings) AS max_existing_id,
  last_value > (SELECT MAX(id) FROM public.store_settings) AS is_safe
FROM pg_sequences
WHERE sequencename = 'store_settings_id_seq';

-- Step 3: Ensure every registered user already has a settings row
-- (backfill for anyone missing one due to the broken state)
INSERT INTO public.store_settings (
  owner_id,
  store_name,
  email,
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
  au.id,
  'My Store',
  au.email,
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
FROM auth.users au
LEFT JOIN public.store_settings ss ON ss.owner_id = au.id
WHERE ss.id IS NULL  -- only users with NO settings row
ON CONFLICT (owner_id) DO NOTHING;
