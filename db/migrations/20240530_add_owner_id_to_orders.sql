-- Add owner_id column to orders table
-- This migration adds the owner_id column (uuid) to associate orders with the authenticated user
-- It sets a default of auth.uid() and creates a foreign key to auth.users(id)

ALTER TABLE orders
  ADD COLUMN owner_id uuid NOT NULL DEFAULT auth.uid();

-- Add foreign key constraint for referential integrity
ALTER TABLE orders
  ADD CONSTRAINT orders_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Ensure RLS policy uses owner_id (if not already present)
-- Allow the owner to select, insert, update, delete their own orders

CREATE POLICY "Allow select own orders" ON orders
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Allow insert own orders" ON orders
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Allow update own orders" ON orders
  FOR UPDATE USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Allow delete own orders" ON orders
  FOR DELETE USING (auth.uid() = owner_id);
