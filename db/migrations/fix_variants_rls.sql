-- Enable RLS on the variants table (just in case it's not enabled)
ALTER TABLE public.variants ENABLE ROW LEVEL SECURITY;

-- 1. Policy for SELECT: Users can read variants of products they own
CREATE POLICY "Users can view variants of their own products"
ON public.variants
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.products
    WHERE products.id = variants.product_id
    AND products.owner_id = auth.uid()
  )
);

-- 2. Policy for INSERT: Users can insert variants into products they own
CREATE POLICY "Users can insert variants for their own products"
ON public.variants
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.products
    WHERE products.id = variants.product_id
    AND products.owner_id = auth.uid()
  )
);

-- 3. Policy for UPDATE: Users can update variants of products they own
CREATE POLICY "Users can update variants of their own products"
ON public.variants
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.products
    WHERE products.id = variants.product_id
    AND products.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.products
    WHERE products.id = variants.product_id
    AND products.owner_id = auth.uid()
  )
);

-- 4. Policy for DELETE: Users can delete variants of products they own
CREATE POLICY "Users can delete variants of their own products"
ON public.variants
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.products
    WHERE products.id = variants.product_id
    AND products.owner_id = auth.uid()
  )
);
