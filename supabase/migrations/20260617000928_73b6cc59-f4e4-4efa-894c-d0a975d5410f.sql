-- Circuit mode on sessions
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS is_circuit boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS circuit_rounds integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS circuit_rest_seconds integer NOT NULL DEFAULT 60;

ALTER TABLE public.sessions
  ADD CONSTRAINT sessions_circuit_rounds_chk CHECK (circuit_rounds BETWEEN 1 AND 20),
  ADD CONSTRAINT sessions_circuit_rest_chk CHECK (circuit_rest_seconds BETWEEN 0 AND 600);

-- Per-exercise video link (acts as override; master library to come later)
ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS video_url text;

ALTER TABLE public.exercises
  ADD CONSTRAINT exercises_video_url_chk
  CHECK (video_url IS NULL OR video_url ~* '^(https?://)?(www\.)?(youtube\.com|youtu\.be)/');
