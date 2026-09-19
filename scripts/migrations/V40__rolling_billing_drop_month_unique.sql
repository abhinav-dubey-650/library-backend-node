-- ============================================================
-- V40: Rolling plan-length billing (drop per-month invoice uniqueness)
-- ------------------------------------------------------------
-- Auto billing switched from "join-date anniversary, one invoice per calendar
-- month" to a mobile-recharge model: bill again every plan.duration_days from
-- the LAST generated invoice. Two 30-day cycles can legitimately fall in the
-- same calendar month (e.g. 1 May + 31 May), so the per-(user, year, month)
-- UNIQUE constraint must go — it silently swallowed the second cycle.
--
-- Dedup now happens in code via "last invoice at least duration_days old",
-- so this migration is safe: no re-run of the job can double-bill within the
-- plan window.
-- ============================================================

ALTER TABLE fee_invoices
  DROP CONSTRAINT IF EXISTS fee_invoices_user_id_billing_year_billing_month_key;

-- "latest invoice per user" is now the billing-cadence anchor; index it.
CREATE INDEX IF NOT EXISTS idx_fee_invoices_user_generated
  ON fee_invoices(user_id, generated_at DESC);