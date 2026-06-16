
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS is_rest_day BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS day_index INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS group_id UUID,
  ADD COLUMN IF NOT EXISTS group_label TEXT,
  ADD COLUMN IF NOT EXISTS group_color TEXT,
  ADD COLUMN IF NOT EXISTS rest_seconds INTEGER;

ALTER TABLE public.exercises
  DROP CONSTRAINT IF EXISTS exercises_rest_range;
ALTER TABLE public.exercises
  ADD CONSTRAINT exercises_rest_range
    CHECK (rest_seconds IS NULL OR (rest_seconds >= 0 AND rest_seconds <= 600));

ALTER TABLE public.exercises
  DROP CONSTRAINT IF EXISTS exercises_group_label_len;
ALTER TABLE public.exercises
  ADD CONSTRAINT exercises_group_label_len
    CHECK (group_label IS NULL OR length(group_label) <= 20);

CREATE INDEX IF NOT EXISTS exercises_session_group_idx
  ON public.exercises(session_id, group_id, order_index);
