
-- 1) post_workout_logs
CREATE TABLE IF NOT EXISTS public.post_workout_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL,
  session_id uuid,
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  rpe integer NOT NULL,
  fatigue integer NOT NULL,
  soreness integer NOT NULL,
  mood integer NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS post_workout_logs_athlete_date_idx
  ON public.post_workout_logs (athlete_id, log_date DESC);

ALTER TABLE public.post_workout_logs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.validate_post_workout_log()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.rpe < 1 OR NEW.rpe > 10 THEN RAISE EXCEPTION 'rpe out of range (1-10)'; END IF;
  IF NEW.fatigue < 0 OR NEW.fatigue > 10 THEN RAISE EXCEPTION 'fatigue out of range (0-10)'; END IF;
  IF NEW.soreness < 0 OR NEW.soreness > 10 THEN RAISE EXCEPTION 'soreness out of range (0-10)'; END IF;
  IF NEW.mood < 0 OR NEW.mood > 10 THEN RAISE EXCEPTION 'mood out of range (0-10)'; END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS validate_post_workout_log_trg ON public.post_workout_logs;
CREATE TRIGGER validate_post_workout_log_trg
  BEFORE INSERT OR UPDATE ON public.post_workout_logs
  FOR EACH ROW EXECUTE FUNCTION public.validate_post_workout_log();

CREATE POLICY "pwl: athlete manage own"
  ON public.post_workout_logs FOR ALL TO authenticated
  USING (athlete_id = auth.uid())
  WITH CHECK (athlete_id = auth.uid());

CREATE POLICY "pwl: coach read team"
  ON public.post_workout_logs FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'coach') AND user_team_id(athlete_id) = my_team_id());

CREATE POLICY "pwl: physio read all"
  ON public.post_workout_logs FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'physio'));

CREATE POLICY "pwl: admin read all"
  ON public.post_workout_logs FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'));

-- 2) physio_case_notes
CREATE TABLE IF NOT EXISTS public.physio_case_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL,
  physio_id uuid NOT NULL,
  case_date date NOT NULL DEFAULT CURRENT_DATE,
  injury_record_id uuid,
  note text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS physio_case_notes_athlete_idx
  ON public.physio_case_notes (athlete_id, case_date DESC);

ALTER TABLE public.physio_case_notes ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS physio_case_notes_updated_at ON public.physio_case_notes;
CREATE TRIGGER physio_case_notes_updated_at
  BEFORE UPDATE ON public.physio_case_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "case_notes: physio manage"
  ON public.physio_case_notes FOR ALL TO authenticated
  USING (has_role(auth.uid(),'physio'))
  WITH CHECK (has_role(auth.uid(),'physio') AND physio_id = auth.uid());

CREATE POLICY "case_notes: athlete read own"
  ON public.physio_case_notes FOR SELECT TO authenticated
  USING (athlete_id = auth.uid());

CREATE POLICY "case_notes: admin read all"
  ON public.physio_case_notes FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'));

-- 3) RTP notes column
ALTER TABLE public.injury_records
  ADD COLUMN IF NOT EXISTS rtp_notes text;
