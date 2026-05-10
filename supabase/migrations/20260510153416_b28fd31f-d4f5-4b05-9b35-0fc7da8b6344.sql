-- Atomic single-use consumption of team invites (race-safe)
CREATE OR REPLACE FUNCTION public.consume_team_invite(_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _team uuid;
  _exists boolean;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  -- Atomically claim the invite: only succeeds if it is still unused
  -- AND not expired. RETURNING gives us the team to join in one round-trip.
  UPDATE public.team_invites
     SET used_at = now(), used_by = _uid
   WHERE token = _token
     AND used_at IS NULL
     AND expires_at > now()
   RETURNING team_id INTO _team;

  IF _team IS NULL THEN
    -- distinguish reasons for a clearer client-side message
    SELECT EXISTS(SELECT 1 FROM public.team_invites WHERE token = _token) INTO _exists;
    IF NOT _exists THEN
      RAISE EXCEPTION 'invite not found' USING ERRCODE = '22023';
    END IF;
    -- Either already used or expired; both map to the same UX
    RAISE EXCEPTION 'invite already used or expired' USING ERRCODE = '22023';
  END IF;

  UPDATE public.profiles SET team_id = _team WHERE id = _uid;
  RETURN _team;
END;
$$;

-- Physios on the team can also mint invite links for that team
DROP POLICY IF EXISTS "team_invites: physio manage team" ON public.team_invites;
CREATE POLICY "team_invites: physio manage team"
ON public.team_invites
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'physio'::app_role)
  AND team_id = my_team_id()
)
WITH CHECK (
  has_role(auth.uid(), 'physio'::app_role)
  AND team_id = my_team_id()
  AND created_by = auth.uid()
);
