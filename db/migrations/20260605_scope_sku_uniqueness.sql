-- ================================================================
-- DATABASE MIGRATION: Scope SKU uniqueness per owner
-- Run this in: Supabase Dashboard → SQL Editor → Run
-- ================================================================

-- 1. Modify products table unique constraints
-- Drop the global unique constraint on sku if it exists
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_sku_key;

-- Add a composite unique constraint on (owner_id, sku)
-- This allows different owners to reuse the same SKU while preventing duplicates for the same owner
ALTER TABLE public.products ADD CONSTRAINT products_owner_id_sku_key UNIQUE (owner_id, sku);

-- 2. Modify variants table unique constraints
-- Drop the global unique constraint on sku if it exists
ALTER TABLE public.variants DROP CONSTRAINT IF EXISTS variants_sku_key;

-- Add a composite unique constraint on (owner_id, sku) for variants
ALTER TABLE public.variants ADD CONSTRAINT variants_owner_id_sku_key UNIQUE (owner_id, sku);
