-- Reverses 002: teams go back to exactly one owner, stored in
-- teams.owner_id. For a team that had co-owners, the single owner is, in
-- order of preference: the creator if still an owner, another current
-- owner, the creator if still a member, then the longest-standing member.
ALTER TABLE teams RENAME COLUMN created_by TO owner_id;

UPDATE teams SET owner_id = (
  SELECT tm.user_id
  FROM team_members tm
  WHERE tm.team_id = teams.id
  ORDER BY
    (tm.user_id = teams.owner_id AND tm.role = 'owner') DESC,
    (tm.role = 'owner') DESC,
    (tm.user_id = teams.owner_id) DESC,
    tm.joined_at,
    tm.user_id
  LIMIT 1
)
WHERE EXISTS (SELECT 1 FROM team_members tm WHERE tm.team_id = teams.id);

DROP INDEX idx_teams_created_by;
CREATE INDEX idx_teams_owner ON teams(owner_id);

DROP INDEX idx_team_members_role;
ALTER TABLE team_members DROP COLUMN role;
