-- Add owner_id column to products table
ALTER TABLE products
ADD COLUMN owner_id uuid NOT NULL DEFAULT uuid_generate_v4();
