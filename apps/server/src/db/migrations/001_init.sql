CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE teams (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_teams_owner ON teams(owner_id);

CREATE TABLE team_members (
  team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (team_id, user_id)
);
CREATE INDEX idx_team_members_user ON team_members(user_id);

-- A board is either personal (owner_user_id) or shared with a team (team_id).
CREATE TABLE boards (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  owner_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
  created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK ((owner_user_id IS NULL) <> (team_id IS NULL))
);
CREATE INDEX idx_boards_owner ON boards(owner_user_id);
CREATE INDEX idx_boards_team ON boards(team_id);

CREATE TABLE stages (
  id INTEGER PRIMARY KEY,
  board_id INTEGER NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position REAL NOT NULL
);
CREATE INDEX idx_stages_board ON stages(board_id, position);

CREATE TABLE tasks (
  id INTEGER PRIMARY KEY,
  board_id INTEGER NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  stage_id INTEGER NOT NULL REFERENCES stages(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  position REAL NOT NULL,
  created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_tasks_stage ON tasks(stage_id, position);
CREATE INDEX idx_tasks_board ON tasks(board_id);

-- Many-to-many: a task can be handled by several people at once.
CREATE TABLE task_assignees (
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, user_id)
);
CREATE INDEX idx_task_assignees_user ON task_assignees(user_id);
