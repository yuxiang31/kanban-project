-- Boards and tasks can carry a colour from a small named palette (see
-- src/utils/palette.js). NULL means no colour.
ALTER TABLE boards ADD COLUMN color TEXT
  CHECK (color IN ('sage', 'sky', 'lilac', 'rose', 'sand', 'peach', 'slate'));

ALTER TABLE tasks ADD COLUMN color TEXT
  CHECK (color IN ('sage', 'sky', 'lilac', 'rose', 'sand', 'peach', 'slate'));
