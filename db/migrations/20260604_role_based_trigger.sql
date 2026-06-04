-- ===============================================================
-- UPDATE USER PROFILES TRIGGER FOR ROLE-BASED SIGNUP
-- ===============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  is_first boolean;
  req_superadmin boolean;
BEGIN
  -- Check if this is the first user in user_profiles
  SELECT NOT EXISTS (SELECT 1 FROM public.user_profiles) INTO is_first;
  
  -- Extract is_superadmin from user metadata passed during signup
  req_superadmin := COALESCE((new.raw_user_meta_data->>'is_superadmin')::boolean, false);
  
  INSERT INTO public.user_profiles (id, email, approved, is_superadmin)
  VALUES (
    new.id,
    new.email,
    -- First registered user OR superadmin email is automatically approved & superadmin.
    -- Otherwise, it is pending approval by default.
    (is_first OR new.email = 'natnaeltsedeke7@gmail.com'),
    (is_first OR new.email = 'natnaeltsedeke7@gmail.com' OR req_superadmin)
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
