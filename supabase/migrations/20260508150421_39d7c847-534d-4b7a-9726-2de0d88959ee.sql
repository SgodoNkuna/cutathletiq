
-- Drop old 1-5 CHECK constraints on wellness_checkins
ALTER TABLE public.wellness_checkins
  DROP CONSTRAINT IF EXISTS wellness_checkins_sleep_quality_check,
  DROP CONSTRAINT IF EXISTS wellness_checkins_readiness_check;

-- Migrate values 1-5 -> 2-10
UPDATE public.wellness_checkins
SET sleep_quality = LEAST(10, GREATEST(0, sleep_quality * 2)),
    readiness    = LEAST(10, GREATEST(0, readiness * 2))
WHERE sleep_quality <= 5 OR readiness <= 5;

-- New 0-10 constraints
ALTER TABLE public.wellness_checkins
  ADD CONSTRAINT wellness_checkins_sleep_quality_check CHECK (sleep_quality BETWEEN 0 AND 10),
  ADD CONSTRAINT wellness_checkins_readiness_check    CHECK (readiness     BETWEEN 0 AND 10);

-- team_invites table
CREATE TABLE public.team_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  used_at timestamptz,
  used_by uuid,
  note text
);

CREATE INDEX idx_team_invites_token ON public.team_invites(token);
CREATE INDEX idx_team_invites_team ON public.team_invites(team_id);

ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_invites: coach manage own team"
ON public.team_invites
FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_id AND t.coach_id = auth.uid()))
WITH CHECK (
  created_by = auth.uid()
  AND EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_id AND t.coach_id = auth.uid())
);

CREATE POLICY "team_invites: admin manage all"
ON public.team_invites
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Token lookup (public; token itself is the secret)
CREATE OR REPLACE FUNCTION public.lookup_team_invite(_token text)
RETURNS TABLE(
  invite_id uuid,
  team_id uuid,
  team_name text,
  team_sport text,
  expires_at timestamptz,
  used boolean,
  expired boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ti.id, ti.team_id, t.name, t.sport, ti.expires_at,
    (ti.used_at IS NOT NULL), (ti.expires_at < now())
  FROM public.team_invites ti
  JOIN public.teams t ON t.id = ti.team_id
  WHERE ti.token = _token
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.lookup_team_invite(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_team_invite(text) TO anon, authenticated;

-- Consume invite
CREATE OR REPLACE FUNCTION public.consume_team_invite(_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _invite record;
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO _invite FROM public.team_invites WHERE token = _token LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'invite not found' USING ERRCODE = '22023'; END IF;
  IF _invite.used_at IS NOT NULL THEN RAISE EXCEPTION 'invite already used' USING ERRCODE = '22023'; END IF;
  IF _invite.expires_at < now() THEN RAISE EXCEPTION 'invite expired' USING ERRCODE = '22023'; END IF;

  UPDATE public.profiles SET team_id = _invite.team_id WHERE id = _uid;
  UPDATE public.team_invites SET used_at = now(), used_by = _uid WHERE id = _invite.id;

  RETURN _invite.team_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.consume_team_invite(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_team_invite(text) TO authenticated;
