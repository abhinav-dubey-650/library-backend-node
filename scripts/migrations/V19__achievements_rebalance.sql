-- Rebalance achievements: trim overlapping hour grids, extend streaks to 365, refresh categories

-- Lifetime hours: keep early milestones + three big lifetime goals only
UPDATE achievement_definitions SET is_active = false
WHERE code IN (
  'HOURS_10', 'HOURS_20', 'HOURS_30', 'HOURS_40', 'HOURS_50',
  'HOURS_60', 'HOURS_70', 'HOURS_80', 'HOURS_90', 'HOURS_100',
  'HOURS_110', 'HOURS_120', 'HOURS_130', 'HOURS_140', 'HOURS_150'
);

-- Monthly: drop hour-grid badges (days-only for "This Month")
UPDATE achievement_definitions SET is_active = false
WHERE code IN (
  'MONTH_10H', 'MONTH_25H', 'MONTH_50H', 'MONTH_75H',
  'MONTH_100H', 'MONTH_125H', 'MONTH_150H'
);

-- Streaks: retire scattered milestones; unified ladder up to 365 days
UPDATE achievement_definitions SET is_active = false
WHERE code IN (
  'STREAK_3', 'STREAK_5', 'STREAK_15', 'STREAK_21',
  'STREAK_45', 'STREAK_60', 'STREAK_100'
);

UPDATE achievement_definitions SET
  sort_order = 10,
  title = '7 Day Streak',
  description = 'Study at the library 7 days in a row'
WHERE code = 'STREAK_7';

UPDATE achievement_definitions SET
  sort_order = 13,
  title = '30 Day Streak',
  description = 'Study at the library 30 days in a row'
WHERE code = 'STREAK_30';

INSERT INTO achievement_definitions (code, category, title, description, threshold_value, threshold_unit, icon_key, sort_order) VALUES
('STREAK_3', 'STREAK', '3 Day Spark', 'Study 3 days in a row — momentum starts here', 3, 'STREAK_DAYS', 'streak', 9),
('STREAK_14', 'STREAK', '2 Week Streak', 'Study 14 days in a row — habit forming', 14, 'STREAK_DAYS', 'streak', 11),
('STREAK_21', 'STREAK', '21 Day Habit', 'Build a 21-day study habit at the library', 21, 'STREAK_DAYS', 'streak', 12),
('STREAK_60', 'STREAK', '60 Day Streak', 'Two months straight — elite discipline', 60, 'STREAK_DAYS', 'streak', 14),
('STREAK_90', 'STREAK', '90 Day Streak', 'Three months without missing a day', 90, 'STREAK_DAYS', 'streak', 15),
('STREAK_180', 'STREAK', 'Half-Year Streak', '180 consecutive days — unstoppable', 180, 'STREAK_DAYS', 'streak', 16),
('STREAK_365', 'STREAK', '365 Day Legend', 'A full year of daily study — ultimate streak', 365, 'STREAK_DAYS', 'trophy', 17),
('HOURS_25', 'HOURS', 'Dedicated Learner', '25 lifetime hours at the library', 1500, 'MINUTES', 'hours', 22),
('HOURS_75', 'HOURS', 'Deep Scholar', '75 lifetime hours — serious commitment', 4500, 'MINUTES', 'hours', 23),
('HOURS_150', 'HOURS', 'Library Legend', '150 lifetime hours — mastery milestone', 9000, 'MINUTES', 'trophy', 24),
('DAYS_180', 'ATTENDANCE', '180 Days Club', 'Show up on 180 different days', 180, 'DAYS', 'calendar', 44),
('DAYS_250', 'ATTENDANCE', '250 Days Strong', '250 days of library attendance', 250, 'DAYS', 'calendar', 45),
('DAYS_365', 'ATTENDANCE', 'One Year Member', '365 days at the library — true dedication', 365, 'DAYS', 'trophy', 46),
('MONTH_28D', 'MONTHLY', '28 Days This Month', 'Study at the library on 28 days this month', 28, 'MONTH_DAYS', 'calendar', 75),
('FOCUS_MARATHON', 'TIME_PATTERN', 'Marathon Day', 'Study 8+ hours in a single day at the library', 480, 'DAY_MAX_MINUTES', 'hours', 52),
('WEEKEND_WARRIOR', 'TIME_PATTERN', 'Weekend Warrior', 'Study on 4 weekend days in one month', 4, 'MONTH_WEEKEND_DAYS', 'calendar', 53)
ON CONFLICT (code) DO UPDATE SET
  category = EXCLUDED.category,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  threshold_value = EXCLUDED.threshold_value,
  threshold_unit = EXCLUDED.threshold_unit,
  icon_key = EXCLUDED.icon_key,
  sort_order = EXCLUDED.sort_order,
  is_active = true;
