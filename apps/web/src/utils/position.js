/**
 * @fileoverview Client copy of the server's fractional ordering rule, used
 * for optimistic updates. The server's answer always wins on refetch.
 */

const STEP = 1024;

/**
 * @param {?number} before Position of the item that will precede.
 * @param {?number} after Position of the item that will follow.
 * @return {number}
 */
export function positionBetween(before, after) {
  if (before == null && after == null) {
    return STEP;
  }
  if (before == null) {
    return after / 2;
  }
  if (after == null) {
    return before + STEP;
  }
  return (before + after) / 2;
}
