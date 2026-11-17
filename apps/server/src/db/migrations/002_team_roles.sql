-- Teams can have several owners: ownership moves from teams.owner_id to a
-- role on each membership. The original owner becomes an 'owner' member,
-- and teams.owner_id is renamed to created_by, a record of who created the
-- team that grants no rights.
ALTER TABLE team_members ADD COLUMN role TEXT NOT NULL DEFAULT 'member'
  CHECK (role IN ('owner', 'member'));

UPDATE team_members SET role = 'owner'
WHERE EXISTS (
  SELECT 1 FROM teams t
  WHERE t.id = team_members.team_id AND t.owner_id = team_members.user_id
);

ALTER TABLE teams RENAME COLUMN owner_id TO created_by;
DROP INDEX idx_teams_owner;
CREATE INDEX idx_teams_created_by ON teams(created_by);
CREATE INDEX idx_team_members_role ON team_members(team_id, role);
