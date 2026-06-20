-- Allow users to set their own exam name and date for countdown
ALTER TABLE user_exam_targets
  ALTER COLUMN exam_definition_id DROP NOT NULL;

ALTER TABLE user_exam_targets
  ADD COLUMN IF NOT EXISTS custom_exam_name VARCHAR(128),
  ADD COLUMN IF NOT EXISTS custom_exam_date DATE;
