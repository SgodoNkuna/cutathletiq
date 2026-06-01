
-- Revoke EXECUTE on SECURITY DEFINER functions from anon role.
-- Internal helpers and authenticated-user APIs should never be callable
-- without a valid session.
REVOKE EXECUTE ON FUNCTION public.consume_team_invite(text)             FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.save_game_minutes_bulk(uuid, jsonb)   FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.team_rtp_pulse()                       FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.team_completion_stats(date, date)      FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role)               FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.my_team_id()                           FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.user_team_id(uuid)                     FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.find_team_by_code(text)                FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.lookup_team_invite(text)               FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.validate_invite_code(app_role, text)   FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_join_code()                   FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_updated_at()                       FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_team_join_code()                   FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.profile_self_update_safe(public.profiles, public.profiles) FROM anon, PUBLIC;

-- Validation trigger functions are SECURITY INVOKER already in spirit but
-- still SECURITY DEFINER-flagged in some Postgres views; revoke from anon.
REVOKE EXECUTE ON FUNCTION public.validate_post_workout_log() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.validate_injury_checkin()   FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.validate_set_completion()   FROM anon, PUBLIC;
