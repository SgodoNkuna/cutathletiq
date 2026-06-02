ALTER TABLE public.team_invites
  ADD COLUMN IF NOT EXISTS max_uses integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS use_count integer NOT NULL DEFAULT 0;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'team_invites_max_uses_check') THEN
    ALTER TABLE public.team_invites
      ADD CONSTRAINT team_invites_max_uses_check CHECK (max_uses >= 1 AND max_uses <= 500);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.consume_team_invite(_token text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _team uuid;
  _exists boolean;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  UPDATE public.team_invites
     SET use_count = use_count + 1,
         used_at = CASE WHEN use_count + 1 >= max_uses THEN now() ELSE used_at END,
         used_by = CASE WHEN use_count + 1 >= max_uses THEN _uid ELSE used_by END
   WHERE token = _token
     AND expires_at > now()
     AND use_count < max_uses
   RETURNING team_id INTO _team;

  IF _team IS NULL THEN
    SELECT EXISTS(SELECT 1 FROM public.team_invites WHERE token = _token) INTO _exists;
    IF NOT _exists THEN
      RAISE EXCEPTION 'invite not found' USING ERRCODE = '22023';
    END IF;
    RAISE EXCEPTION 'invite already used or expired' USING ERRCODE = '22023';
  END IF;

  UPDATE public.profiles SET team_id = _team WHERE id = _uid;
  RETURN _team;
END;
$function$;

DROP FUNCTION IF EXISTS public.lookup_team_invite(text);

CREATE FUNCTION public.lookup_team_invite(_token text)
 RETURNS TABLE(invite_id uuid, team_id uuid, team_name text, team_sport text, expires_at timestamp with time zone, used boolean, expired boolean, max_uses integer, use_count integer, seats_remaining integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    ti.id, ti.team_id, t.name, t.sport, ti.expires_at,
    (ti.use_count >= ti.max_uses) AS used,
    (ti.expires_at < now()) AS expired,
    ti.max_uses, ti.use_count,
    GREATEST(ti.max_uses - ti.use_count, 0) AS seats_remaining
  FROM public.team_invites ti
  JOIN public.teams t ON t.id = ti.team_id
  WHERE ti.token = _token
  LIMIT 1;
$function$;