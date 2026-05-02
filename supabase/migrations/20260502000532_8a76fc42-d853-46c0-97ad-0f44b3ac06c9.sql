-- =============================================================
-- 1) set_completions: server-side validation trigger
-- =============================================================
CREATE OR REPLACE FUNCTION public.validate_set_completion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.set_number IS NULL OR NEW.set_number < 1 OR NEW.set_number > 50 THEN
    RAISE EXCEPTION 'set_number out of range (1–50): %', NEW.set_number
      USING ERRCODE = '22023';
  END IF;
  IF NEW.reps IS NULL OR NEW.reps < 1 OR NEW.reps > 200 THEN
    RAISE EXCEPTION 'reps out of range (1–200): %', NEW.reps
      USING ERRCODE = '22023';
  END IF;
  IF NEW.weight_kg IS NOT NULL AND (NEW.weight_kg < 0 OR NEW.weight_kg > 1000) THEN
    RAISE EXCEPTION 'weight_kg out of range (0–1000): %', NEW.weight_kg
      USING ERRCODE = '22023';
  END IF;
  IF NEW.elapsed_sec IS NOT NULL AND (NEW.elapsed_sec < 0 OR NEW.elapsed_sec > 7200) THEN
    RAISE EXCEPTION 'elapsed_sec out of range (0–7200): %', NEW.elapsed_sec
      USING ERRCODE = '22023';
  END IF;
  IF NEW.rpe IS NOT NULL AND (NEW.rpe < 1 OR NEW.rpe > 10) THEN
    RAISE EXCEPTION 'rpe out of range (1–10): %', NEW.rpe
      USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_set_completion ON public.set_completions;
CREATE TRIGGER trg_validate_set_completion
  BEFORE INSERT OR UPDATE ON public.set_completions
  FOR EACH ROW EXECUTE FUNCTION public.validate_set_completion();

-- =============================================================
-- 2) Lock down SECURITY DEFINER functions
--    Trigger-only functions: revoke from both anon and authenticated
-- =============================================================
REVOKE EXECUTE ON FUNCTION public.handle_new_user()           FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_consent_change()        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_high_pain()          FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_low_readiness()      FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_new_programme()      FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_pr()                 FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_rtp_change()         FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_session_completed()  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_team_join_code()        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at()            FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_set_completion()   FROM PUBLIC, anon, authenticated;

-- Caller-side helpers used inside RLS / app — revoke from anon, keep authenticated
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role)             FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.my_team_id()                         FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_team_id(uuid)                   FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.profile_self_update_safe(profiles, profiles) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.has_role(uuid, app_role)             TO authenticated;
GRANT  EXECUTE ON FUNCTION public.my_team_id()                         TO authenticated;
GRANT  EXECUTE ON FUNCTION public.user_team_id(uuid)                   TO authenticated;
GRANT  EXECUTE ON FUNCTION public.profile_self_update_safe(profiles, profiles) TO authenticated;

-- App RPCs — authenticated only
REVOKE EXECUTE ON FUNCTION public.save_game_minutes_bulk(uuid, jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.team_completion_stats(date, date)   FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.team_rtp_pulse()                    FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.find_team_by_code(text)             FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.validate_invite_code(app_role, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.generate_join_code()                FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.save_game_minutes_bulk(uuid, jsonb) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.team_completion_stats(date, date)   TO authenticated;
GRANT  EXECUTE ON FUNCTION public.team_rtp_pulse()                    TO authenticated;
GRANT  EXECUTE ON FUNCTION public.find_team_by_code(text)             TO authenticated;
GRANT  EXECUTE ON FUNCTION public.generate_join_code()                TO authenticated;
-- validate_invite_code is only called from server functions using service role; lock it.
-- (no GRANT to anon/authenticated)
