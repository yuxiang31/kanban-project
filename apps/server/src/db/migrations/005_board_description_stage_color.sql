-- Boards get a short description of what they track; stages get a colour
-- from the same named palette as boards and tasks (src/utils/palette.js).
ALTER TABLE boards ADD COLUMN description TEXT NOT NULL DEFAULT '';

ALTER TABLE stages ADD COLUMN color TEXT
  CHECK (color IN ('sage', 'sky', 'lilac', 'rose', 'sand', 'peach', 'slate'));
