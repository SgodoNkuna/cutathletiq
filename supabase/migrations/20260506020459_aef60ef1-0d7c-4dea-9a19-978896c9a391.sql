-- Add daily function score (1-10) to injury check-ins so physios can track RTP readiness
ALTER TABLE public.injury_checkins
  ADD COLUMN IF NOT EXISTS function_score integer;

-- Validation trigger (CHECK constraints can't be added safely on existing data without scan)
CREATE OR REPLACE FUNCTION public.validate_injury_checkin()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.pain_level IS NULL OR NEW.pain_level < 0 OR NEW.pain_level > 10 THEN
    RAISE EXCEPTION 'pain_level out of range (0-10): %', NEW.pain_level USING ERRCODE = '22023';
  END IF;
  IF NEW.function_score IS NOT NULL AND (NEW.function_score < 0 OR NEW.function_score > 10) THEN
    RAISE EXCEPTION 'function_score out of range (0-10): %', NEW.function_score USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_injury_checkin_trg ON public.injury_checkins;
CREATE TRIGGER validate_injury_checkin_trg
BEFORE INSERT OR UPDATE ON public.injury_checkins
FOR EACH ROW
EXECUTE FUNCTION public.validate_injury_checkin();