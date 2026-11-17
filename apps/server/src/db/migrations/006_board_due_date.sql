-- Boards can have a due date: a calendar day (YYYY-MM-DD), no time or zone.
-- date() normalizes impossible days (2026-02-30 → 2026-03-02), so comparing
-- it with the stored text keeps out anything that is not a real date.
ALTER TABLE boards ADD COLUMN due_date TEXT
  CHECK (due_date IS NULL OR date(due_date) IS due_date);
