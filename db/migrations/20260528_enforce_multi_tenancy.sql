-- ==============================================================
-- MASTER MULTI-TENANCY ISOLATION SCRIPT
-- Enforces that EVERY user has completely isolated stock, orders, and logs.
-- ==============================================================

-- 1. ENSURE ALL TABLES HAVE owner_id
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS owner_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.variants ADD COLUMN IF NOT EXISTS owner_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS owner_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS owner_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.security_logs ADD COLUMN IF NOT EXISTS owner_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

-- 3. DROP EXISTING POLICIES TO AVOID CONFLICTS
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename IN ('products', 'variants', 'orders', 'order_items', 'security_logs')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- 4. CREATE STRICT ISOLATION POLICIES FOR EVERY TABLE

-- PRODUCTS
CREATE POLICY "Strict isolation SELECT products" ON public.products FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Strict isolation INSERT products" ON public.products FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Strict isolation UPDATE products" ON public.products FOR UPDATE USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Strict isolation DELETE products" ON public.products FOR DELETE USING (auth.uid() = owner_id);

-- VARIANTS
CREATE POLICY "Strict isolation SELECT variants" ON public.variants FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Strict isolation INSERT variants" ON public.variants FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Strict isolation UPDATE variants" ON public.variants FOR UPDATE USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Strict isolation DELETE variants" ON public.variants FOR DELETE USING (auth.uid() = owner_id);

-- ORDERS
CREATE POLICY "Strict isolation SELECT orders" ON public.orders FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Strict isolation INSERT orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Strict isolation UPDATE orders" ON public.orders FOR UPDATE USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Strict isolation DELETE orders" ON public.orders FOR DELETE USING (auth.uid() = owner_id);

-- ORDER ITEMS
CREATE POLICY "Strict isolation SELECT order_items" ON public.order_items FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Strict isolation INSERT order_items" ON public.order_items FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Strict isolation UPDATE order_items" ON public.order_items FOR UPDATE USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Strict isolation DELETE order_items" ON public.order_items FOR DELETE USING (auth.uid() = owner_id);

-- SECURITY LOGS
CREATE POLICY "Strict isolation SELECT security_logs" ON public.security_logs FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Strict isolation INSERT security_logs" ON public.security_logs FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Strict isolation UPDATE security_logs" ON public.security_logs FOR UPDATE USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Strict isolation DELETE security_logs" ON public.security_logs FOR DELETE USING (auth.uid() = owner_id);
