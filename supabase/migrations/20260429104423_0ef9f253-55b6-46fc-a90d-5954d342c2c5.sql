-- Fix search_path on enforce_max_locations
CREATE OR REPLACE FUNCTION public.enforce_max_locations()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.locations WHERE class_id = NEW.class_id) >= 5 THEN
    RAISE EXCEPTION 'A turma já tem 5 locais (máximo permitido).';
  END IF;
  RETURN NEW;
END;
$$;

-- Revoke EXECUTE from public/anon/authenticated on internal helpers.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_max_locations() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
-- has_role is intentionally callable by authenticated (used in RLS), so keep it for authenticated.