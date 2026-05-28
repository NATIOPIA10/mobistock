-- ==============================================================
-- EMERGENCY DATA RECOVERY SCRIPT
-- If your data disappeared after enabling RLS, it is because 
-- the 'owner_id' on your existing data was either NULL or 
-- generated randomly before the authentication system was linked.
-- 
-- This script will re-link ALL orphaned data back to your main account.
-- ==============================================================

DO $$
DECLARE
    main_user_id uuid;
BEGIN
    -- 1. Find your main superadmin user ID
    -- Modify the email here if you use a different login email.
    SELECT id INTO main_user_id FROM auth.users WHERE email = 'natnaeltsedeke7@gmail.com' LIMIT 1;

    -- If no user is found, grab the first user in the database
    IF main_user_id IS NULL THEN
        SELECT id INTO main_user_id FROM auth.users ORDER BY created_at ASC LIMIT 1;
    END IF;

    -- 2. Bypass RLS temporarily for this operation
    -- (This happens automatically when running as postgres superuser in SQL Editor)

    -- 3. Recover Products (update if owner_id doesn't match an actual user)
    UPDATE public.products 
    SET owner_id = main_user_id 
    WHERE owner_id NOT IN (SELECT id FROM auth.users) OR owner_id IS NULL;

    -- 4. Recover Orders
    UPDATE public.orders 
    SET owner_id = main_user_id 
    WHERE owner_id NOT IN (SELECT id FROM auth.users) OR owner_id IS NULL;

    -- 5. Recover Variants (inherit from products if missing, or assign to main_user_id)
    UPDATE public.variants v
    SET owner_id = p.owner_id
    FROM public.products p
    WHERE v.product_id = p.id AND (v.owner_id IS NULL OR v.owner_id NOT IN (SELECT id FROM auth.users));

    UPDATE public.variants 
    SET owner_id = main_user_id 
    WHERE owner_id IS NULL;

    -- 6. Recover Order Items (inherit from orders)
    UPDATE public.order_items oi
    SET owner_id = o.owner_id
    FROM public.orders o
    WHERE oi.order_id = o.id AND (oi.owner_id IS NULL OR oi.owner_id NOT IN (SELECT id FROM auth.users));

    UPDATE public.order_items 
    SET owner_id = main_user_id 
    WHERE owner_id IS NULL;

    -- 7. Recover Security Logs
    UPDATE public.security_logs 
    SET owner_id = main_user_id 
    WHERE owner_id NOT IN (SELECT id FROM auth.users) OR owner_id IS NULL;

    -- 8. Recover Store Settings
    UPDATE public.store_settings 
    SET owner_id = main_user_id 
    WHERE owner_id NOT IN (SELECT id FROM auth.users) OR owner_id IS NULL;

END $$;
