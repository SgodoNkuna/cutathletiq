-- Enable trigram extension first (used by the search index below)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE public.exercise_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  equipment text,
  muscle_groups text[] NOT NULL DEFAULT '{}',
  default_sets integer NOT NULL DEFAULT 3,
  default_reps integer NOT NULL DEFAULT 8,
  default_rest_seconds integer NOT NULL DEFAULT 60,
  instructions text,
  video_url text,
  is_global boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT exercise_templates_sets_chk CHECK (default_sets BETWEEN 1 AND 20),
  CONSTRAINT exercise_templates_reps_chk CHECK (default_reps BETWEEN 0 AND 200),
  CONSTRAINT exercise_templates_rest_chk CHECK (default_rest_seconds BETWEEN 0 AND 600),
  CONSTRAINT exercise_templates_video_chk CHECK (
    video_url IS NULL OR video_url ~* '^https?://(www\.)?(youtube\.com|youtu\.be)/'
  )
);

CREATE INDEX exercise_templates_name_trgm_idx ON public.exercise_templates
  USING gin (lower(name) gin_trgm_ops);
CREATE INDEX exercise_templates_category_idx ON public.exercise_templates (category);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercise_templates TO authenticated;
GRANT ALL ON public.exercise_templates TO service_role;

ALTER TABLE public.exercise_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches and admins can view library"
  ON public.exercise_templates FOR SELECT
  TO authenticated
  USING (
    (is_global = true AND (public.has_role(auth.uid(), 'coach') OR public.has_role(auth.uid(), 'admin')))
    OR created_by = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Coaches can insert their own templates"
  ON public.exercise_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND is_global = false
    AND public.has_role(auth.uid(), 'coach')
  );

CREATE POLICY "Owners and admins can update templates"
  ON public.exercise_templates FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners and admins can delete templates"
  ON public.exercise_templates FOR DELETE
  TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER exercise_templates_updated_at
  BEFORE UPDATE ON public.exercise_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed: ~40 common exercises (global library)
INSERT INTO public.exercise_templates (name, category, equipment, muscle_groups, default_sets, default_reps, default_rest_seconds, instructions, is_global) VALUES
('Back Squat', 'legs', 'barbell', ARRAY['quads','glutes','hamstrings','core'], 4, 6, 120, 'Bar on traps, brace core, descend to parallel, drive through mid-foot.', true),
('Front Squat', 'legs', 'barbell', ARRAY['quads','core'], 4, 5, 120, 'Bar in front rack, elbows high, vertical torso.', true),
('Romanian Deadlift', 'legs', 'barbell', ARRAY['hamstrings','glutes','back'], 3, 8, 90, 'Hinge at hips, soft knees, bar tracks legs.', true),
('Conventional Deadlift', 'legs', 'barbell', ARRAY['hamstrings','glutes','back','traps'], 4, 5, 150, 'Bar over mid-foot, neutral spine, push the floor away.', true),
('Bulgarian Split Squat', 'legs', 'dumbbell', ARRAY['quads','glutes'], 3, 10, 75, 'Rear foot elevated, drop straight down, drive through front heel.', true),
('Walking Lunge', 'legs', 'dumbbell', ARRAY['quads','glutes'], 3, 12, 60, 'Long stride, back knee just off floor.', true),
('Hip Thrust', 'legs', 'barbell', ARRAY['glutes','hamstrings'], 4, 8, 90, 'Shoulders on bench, drive hips up, squeeze glutes at top.', true),
('Box Jump', 'legs', 'box', ARRAY['quads','glutes','calves'], 5, 5, 90, 'Triple extension, soft landing, step down each rep.', true),
('Bench Press', 'push', 'barbell', ARRAY['chest','triceps','shoulders'], 4, 6, 120, 'Tuck shoulder blades, bar to lower chest, drive feet.', true),
('Incline Dumbbell Press', 'push', 'dumbbell', ARRAY['chest','shoulders'], 3, 10, 75, '30–45° bench, control descent.', true),
('Overhead Press', 'push', 'barbell', ARRAY['shoulders','triceps','core'], 4, 5, 120, 'Bar from shoulders to overhead, ribs down, glutes tight.', true),
('Push Press', 'push', 'barbell', ARRAY['shoulders','triceps','quads'], 4, 5, 120, 'Quick dip-drive, finish vertical overhead.', true),
('Dumbbell Shoulder Press', 'push', 'dumbbell', ARRAY['shoulders','triceps'], 3, 10, 75, 'Seated or standing, full ROM.', true),
('Push-Up', 'push', 'bodyweight', ARRAY['chest','triceps','core'], 3, 15, 45, 'Body straight, chest to floor, full lockout.', true),
('Dip', 'push', 'parallel bars', ARRAY['chest','triceps','shoulders'], 3, 8, 75, 'Shoulders down, elbows back, full lockout.', true),
('Pull-Up', 'pull', 'bar', ARRAY['lats','biceps','back'], 4, 6, 90, 'Dead hang, chin over bar, controlled descent.', true),
('Chin-Up', 'pull', 'bar', ARRAY['lats','biceps'], 3, 8, 90, 'Underhand grip, chin over bar.', true),
('Bent-Over Row', 'pull', 'barbell', ARRAY['back','biceps'], 4, 8, 90, 'Hinge to 45°, pull to lower ribs.', true),
('Single-Arm Dumbbell Row', 'pull', 'dumbbell', ARRAY['back','biceps'], 3, 10, 60, 'Knee + hand on bench, pull elbow past hip.', true),
('Lat Pulldown', 'pull', 'cable', ARRAY['lats','back'], 3, 10, 75, 'Lean back slightly, bar to upper chest.', true),
('Seated Cable Row', 'pull', 'cable', ARRAY['back','biceps'], 3, 10, 75, 'Chest up, drive elbows back, squeeze mid-back.', true),
('Face Pull', 'pull', 'cable', ARRAY['rear delts','upper back'], 3, 15, 45, 'Rope to forehead, elbows high, external rotation.', true),
('Plank', 'core', 'bodyweight', ARRAY['core'], 3, 0, 45, 'Hold 30–60s. Glutes squeezed, neutral spine.', true),
('Side Plank', 'core', 'bodyweight', ARRAY['obliques','core'], 3, 0, 45, 'Hold 30s each side. Stack hips.', true),
('Hanging Leg Raise', 'core', 'bar', ARRAY['core','hip flexors'], 3, 10, 60, 'No swing, raise legs to 90°.', true),
('Dead Bug', 'core', 'bodyweight', ARRAY['core'], 3, 10, 30, 'Lower back pinned, opposite arm/leg slow.', true),
('Pallof Press', 'core', 'cable', ARRAY['core','obliques'], 3, 12, 45, 'Anti-rotation, press straight out, resist twist.', true),
('Assault Bike Sprint', 'cardio', 'bike', ARRAY['full body'], 8, 0, 60, '20s all-out, 60s rest.', true),
('Rowing Intervals', 'cardio', 'rower', ARRAY['full body'], 6, 0, 90, '500m at 90% effort.', true),
('400m Run', 'cardio', 'track', ARRAY['legs','cardio'], 6, 0, 120, 'Target pace, full recovery between.', true),
('Burpee', 'cardio', 'bodyweight', ARRAY['full body'], 4, 12, 60, 'Chest to floor, jump at top.', true),
('Kettlebell Swing', 'cardio', 'kettlebell', ARRAY['glutes','hamstrings','core'], 5, 15, 60, 'Hip hinge, KB to chest height.', true),
('Worlds Greatest Stretch', 'mobility', 'bodyweight', ARRAY['hips','t-spine'], 2, 6, 30, 'Lunge, hand to floor, rotate up. Alternate sides.', true),
('Hip 90/90', 'mobility', 'bodyweight', ARRAY['hips'], 2, 8, 30, 'Switch hips side to side, sit tall.', true),
('Cat-Cow', 'mobility', 'bodyweight', ARRAY['spine'], 2, 10, 20, 'Slow spinal flexion/extension.', true),
('Band Pull-Apart', 'mobility', 'band', ARRAY['rear delts','upper back'], 3, 15, 30, 'Arms straight, squeeze shoulder blades.', true),
('Sprint Start (10m)', 'sport', 'track', ARRAY['legs','cardio'], 6, 0, 90, 'Explosive 3-point start, full recovery.', true),
('Cone Agility (5-10-5)', 'sport', 'cones', ARRAY['legs','cardio'], 6, 0, 90, '5y right, 10y left, 5y right. Touch each line.', true),
('Med Ball Slam', 'sport', 'med ball', ARRAY['core','shoulders'], 4, 8, 45, 'Full extension overhead, slam to floor.', true),
('Tackle Bag Drive', 'sport', 'tackle bag', ARRAY['full body'], 5, 5, 60, 'Low body position, drive through bag for 5m.', true),
('Lineout Lift Practice', 'sport', 'bodyweight', ARRAY['full body'], 4, 4, 90, 'Partner lift, hold 3s, control descent.', true);
