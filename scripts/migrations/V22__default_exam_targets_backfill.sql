-- Default exam target for existing members without one (1 year from registration date)

INSERT INTO user_exam_targets (user_id, exam_definition_id, custom_exam_name, custom_exam_date)
SELECT u.id, NULL,
       'Please set your exam from study log tab in my progress page',
       (COALESCE(u.created_at::date, CURRENT_DATE) + INTERVAL '365 days')::date
FROM users u
WHERE u.role = 'MEMBER'
  AND NOT EXISTS (SELECT 1 FROM user_exam_targets uet WHERE uet.user_id = u.id);
