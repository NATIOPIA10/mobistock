-- =========================================
-- DROP OLD PRODUCT TABLE + POLICIES
-- =========================================

DROP TABLE IF EXISTS public.products CASCADE;

-- =========================================
-- CREATE PRODUCTS TABLE
-- =========================================

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text NOT NULL UNIQUE,
  title text NOT NULL,
  brand text,
  category text,
  description text,
  image_url text,
  is_archived boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- =========================================
-- ENABLE ROW LEVEL SECURITY
-- =========================================

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- =========================================
-- RLS POLICIES
-- =========================================

-- Users can read their own products
CREATE POLICY "Users can view own products"
  ON public.products
  FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);

-- Users can insert their own products
CREATE POLICY "Users can insert own products"
  ON public.products
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

-- Users can update their own products
CREATE POLICY "Users can update own products"
  ON public.products
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Users can delete their own products
CREATE POLICY "Users can delete own products"
  ON public.products
  FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- =========================================
-- OPTIONAL: Automatically set owner_id to logged-in user
-- =========================================

ALTER TABLE public.products
  ALTER COLUMN owner_id SET DEFAULT auth.uid();
