/**
 * @fileoverview Colours a board or task can carry. Mirrors the server's
 * palette (apps/server/src/utils/palette.js); tones live in global.css so
 * each name can look right in light and dark themes.
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

/** @param {string} color @return {string} e.g. "Sky". */
export const colorLabel = (color) => color[0].toUpperCase() + color.slice(1);
