-- Allow admin role in invite_codes (was only coach/physio before).
-- Insert a default row if none exists (admin can rotate it from /admin/invites).
INSERT INTO public.invite_codes (role, code)
SELECT 'admin'::app_role, 'CHANGE-ME-' || substr(md5(random()::text), 1, 6)
WHERE NOT EXISTS (SELECT 1 FROM public.invite_codes WHERE role = 'admin');