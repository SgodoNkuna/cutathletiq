
-- Section 7: set_completions
CREATE TABLE IF NOT EXISTS public.set_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL,
  session_id uuid NOT NULL,
  exercise_id uuid NOT NULL,
  set_number integer NOT NULL,
  reps integer NOT NULL,
  weight_kg numeric(6,2),
  elapsed_sec integer,
  rpe integer,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (athlete_id, exercise_id, set_number, completed_at)
);

ALTER TABLE public.set_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "set_completions: athlete manage own"
  ON public.set_completions FOR ALL TO authenticated
  USING (athlete_id = auth.uid())
  WITH CHECK (athlete_id = auth.uid());

CREATE POLICY "set_completions: coach read team"
  ON public.set_completions FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'coach') AND user_team_id(athlete_id) = my_team_id());

CREATE POLICY "set_completions: admin read all"
  ON public.set_completions FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'));

CREATE POLICY "set_completions: physio read all"
  ON public.set_completions FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'physio'));

CREATE INDEX IF NOT EXISTS idx_set_completions_athlete ON public.set_completions(athlete_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_set_completions_session ON public.set_completions(session_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.set_completions;
ALTER TABLE public.set_completions REPLICA IDENTITY FULL;

-- Also enable realtime for nudges so notifications appear live
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.nudges;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE public.nudges REPLICA IDENTITY FULL;

-- Section 8: wellness_skips (server-side skip persistence, one per athlete per day)
CREATE TABLE IF NOT EXISTS public.wellness_skips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL,
  skip_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (athlete_id, skip_date)
);

ALTER TABLE public.wellness_skips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wellness_skips: athlete manage own"
  ON public.wellness_skips FOR ALL TO authenticated
  USING (athlete_id = auth.uid())
  WITH CHECK (athlete_id = auth.uid());

CREATE POLICY "wellness_skips: coach read team"
  ON public.wellness_skips FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'coach') AND user_team_id(athlete_id) = my_team_id());

-- Section 8: Low readiness coach nudge
CREATE OR REPLACE FUNCTION public.notify_low_readiness()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  athlete_first text;
  athlete_team uuid;
BEGIN
  IF new.readiness > 2 THEN RETURN new; END IF;
  SELECT first_name, team_id INTO athlete_first, athlete_team
    FROM public.profiles WHERE id = new.athlete_id;
  IF athlete_team IS NULL THEN RETURN new; END IF;

  INSERT INTO public.nudges (recipient_id, sender_id, type, message, link_path)
  SELECT p.id, new.athlete_id, 'checkin_reminder',
         COALESCE(athlete_first,'An athlete') || ' logged low readiness ('
           || new.readiness || '/5) today.',
         '/coach'
  FROM public.profiles p
  WHERE p.team_id = athlete_team AND p.role = 'coach';
  RETURN new;
END $$;

DROP TRIGGER IF EXISTS trg_notify_low_readiness ON public.wellness_checkins;
CREATE TRIGGER trg_notify_low_readiness
  AFTER INSERT ON public.wellness_checkins
  FOR EACH ROW EXECUTE FUNCTION public.notify_low_readiness();
