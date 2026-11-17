/**
 * @fileoverview The colours a board or task can be given. Names, not hex
 * values: the web app maps each name to tones that suit light and dark
 * themes, and the database CHECK constraint uses the same list.
 */

export const COLORS = [
  'sage',
  'sky',
  'lilac',
  'rose',
  'sand',
  'peach',
  'slate',
];

/** JSON schema for an optional colour: a palette name, or null for none. */
export const colorSchema = {type: ['string', 'null'], enum: [...COLORS, null]};
