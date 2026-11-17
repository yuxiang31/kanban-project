/**
 * @fileoverview Fractional ordering. Items are sorted by a REAL `position`;
 * inserting between two items uses their midpoint so only the moved row
 * changes.
 */

import {badRequest} from './errors.js';

const STEP = 1024;

/**
 * Position for an item appended after the current last one.
 * @param {?number} maxPosition Largest existing position, or null if empty.
 * @return {number}
 */
export function nextPosition(maxPosition) {
  return maxPosition == null ? STEP : maxPosition + STEP;
}

/**
 * Position between two neighbours (either may be null at the ends).
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

/**
 * Validates the neighbours a moved item will land between and returns its
 * new position. Each neighbour id may be null (meaning "at that end").
 * @param {{
 *   movingId: number,
 *   prevId: ?number,
 *   nextId: ?number,
 *   find: function(number): (!Object|undefined),
 *   belongs: function(!Object): boolean,
 * }} args `find` loads a row with a `position`; `belongs` checks the row is
 *     in the same container (board or stage) as the destination.
 * @return {number}
 */
export function positionFromNeighbours({
  movingId,
  prevId,
  nextId,
  find,
  belongs,
}) {
  const load = (id) => {
    if (id == null) {
      return null;
    }
    const row = id === movingId ? null : find(id);
    if (!row || !belongs(row)) {
      throw badRequest('Invalid position.');
    }
    return row;
  };
  const prev = load(prevId);
  const next = load(nextId);
  if (prev && next && prev.position >= next.position) {
    throw badRequest('Invalid position.');
  }
  return positionBetween(prev?.position ?? null, next?.position ?? null);
}
