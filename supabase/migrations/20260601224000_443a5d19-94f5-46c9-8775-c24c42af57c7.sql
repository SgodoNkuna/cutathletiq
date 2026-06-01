
-- 1) Tighten data_access_log INSERT policy: prevent ordinary teammates
--    from fabricating access-log entries against other users on their team.
DROP POLICY IF EXISTS "access_log: actor write own" ON public.data_access_log;
CREATE POLICY "access_log: actor write own"
ON public.data_access_log
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = actor_id
  AND (
    subject_id = auth.uid()
    OR (
      public.user_team_id(subject_id) = public.my_team_id()
      AND (
        public.has_role(auth.uid(), 'coach'::app_role)
        OR public.has_role(auth.uid(), 'physio'::app_role)
        OR public.has_role(auth.uid(), 'admin'::app_role)
      )
    )
  )
);

-- 2) Add explicit admin-only UPDATE policy on the announcements storage bucket.
CREATE POLICY "announcements: admin update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'announcements' AND public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (bucket_id = 'announcements' AND public.has_role(auth.uid(), 'admin'::app_role));

-- 3) Revoke EXECUTE on internal trigger functions from API-exposed roles.
--    Triggers run as the table owner regardless of caller perms, so this is
--    safe and removes them from the PostgREST surface.
REVOKE EXECUTE ON FUNCTION public.notify_rtp_change()        FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_session_completed() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_low_readiness()     FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_new_programme()     FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_pr()                FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_high_pain()         FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_consent_change()       FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user()          FROM anon, authenticated, PUBLIC;
