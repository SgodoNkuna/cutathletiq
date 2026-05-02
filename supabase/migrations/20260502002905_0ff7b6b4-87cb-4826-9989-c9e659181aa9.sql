-- =====================================================================
-- Tighten EXECUTE on SECURITY DEFINER functions to address linter
-- warnings 0028 (anon callable) and 0029 (authenticated callable).
--
-- Strategy:
--   * Trigger / notification helpers: revoke from PUBLIC, anon, authenticated.
--     Triggers run as the table owner regardless of EXECUTE grants.
--   * RLS helpers (has_role, my_team_id, user_team_id): keep callable by
--     authenticated only. They are required during policy evaluation but
--     should never be reachable by anonymous traffic.
--   * Explicit RPCs the client calls (find_team_by_code,
--     validate_invite_code, save_game_minutes_bulk, team_completion_stats,
--     team_rtp_pulse): callable by authenticated only.
-- =====================================================================

-- ---- Trigger / internal-only functions ------------------------------
REVOKE EXECUTE ON FUNCTION public.handle_new_user()                FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_consent_change()             FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_high_pain()               FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_low_readiness()           FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_new_programme()           FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_pr()                      FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_rtp_change()              FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_session_completed()       FROM PUBLIC, anon, authenticated;

-- ---- RLS helpers: authenticated only --------------------------------
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role)  FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.has_role(uuid, public.app_role)  TO   authenticated;

REVOKE EXECUTE ON FUNCTION public.my_team_id()                     FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.my_team_id()                     TO   authenticated;

REVOKE EXECUTE ON FUNCTION public.user_team_id(uuid)               FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.user_team_id(uuid)               TO   authenticated;

-- ---- Explicit RPCs: authenticated only ------------------------------
REVOKE EXECUTE ON FUNCTION public.find_team_by_code(text)               FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.find_team_by_code(text)               TO   authenticated;

REVOKE EXECUTE ON FUNCTION public.validate_invite_code(public.app_role, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.validate_invite_code(public.app_role, text) TO   authenticated;

REVOKE EXECUTE ON FUNCTION public.save_game_minutes_bulk(uuid, jsonb)   FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.save_game_minutes_bulk(uuid, jsonb)   TO   authenticated;

REVOKE EXECUTE ON FUNCTION public.team_completion_stats(date, date)     FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.team_completion_stats(date, date)     TO   authenticated;

REVOKE EXECUTE ON FUNCTION public.team_rtp_pulse()                      FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.team_rtp_pulse()                      TO   authenticated;