-- An optional to-do list on each task. Items keep the order they were
-- added in (fractional position, like tasks) and go with their task.
CREATE TABLE task_checklist_items (
  id INTEGER PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  text TEXT NOT NULL CHECK (length(text) BETWEEN 1 AND 300),
  done INTEGER NOT NULL DEFAULT 0 CHECK (done IN (0, 1)),
  position REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_checklist_items_task ON task_checklist_items(task_id, position);
