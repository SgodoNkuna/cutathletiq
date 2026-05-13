INSERT INTO public.profiles (
  id,
  email,
  first_name,
  last_name,
  role,
  sport,
  position,
  consent_coach_training,
  consent_physio_health,
  consent_at,
  onboarding_complete
)
SELECT
  u.id,
  COALESCE(NULLIF(u.email, ''), u.id::text || '@missing-email.local') AS email,
  COALESCE(NULLIF(u.raw_user_meta_data->>'first_name', ''), split_part(COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', ''), ' ', 1), '') AS first_name,
  COALESCE(NULLIF(u.raw_user_meta_data->>'last_name', ''), NULLIF(trim(regexp_replace(COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', ''), '^\S+\s*', '')), ''), '') AS last_name,
  CASE
    WHEN u.raw_user_meta_data->>'role' IN ('athlete', 'coach', 'physio', 'admin')
      THEN (u.raw_user_meta_data->>'role')::public.app_role
    ELSE 'athlete'::public.app_role
  END AS role,
  NULLIF(u.raw_user_meta_data->>'sport', '') AS sport,
  NULLIF(u.raw_user_meta_data->>'position', '') AS position,
  COALESCE((u.raw_user_meta_data->>'consent_coach_training')::boolean, false) AS consent_coach_training,
  COALESCE((u.raw_user_meta_data->>'consent_physio_health')::boolean, false) AS consent_physio_health,
  CASE
    WHEN (u.raw_user_meta_data->>'consent_coach_training')::boolean IS TRUE
      OR (u.raw_user_meta_data->>'consent_physio_health')::boolean IS TRUE
    THEN now()
    ELSE NULL
  END AS consent_at,
  false AS onboarding_complete
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = u.id
);