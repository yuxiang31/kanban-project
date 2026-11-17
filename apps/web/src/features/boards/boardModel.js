/**
 * @fileoverview Pure helpers over the board payload.
 */

/**
 * Groups a board's tasks by stage, keeping each stage's order.
 * @param {!Array<!Object>} tasks Tasks with `stageId` and `position`.
 * @return {!Map<number, !Array<!Object>>}
 */
export function tasksByStage(tasks) {
  const groups = new Map();
  for (const task of [...tasks].sort((a, b) => a.position - b.position)) {
    if (!groups.has(task.stageId)) {
      groups.set(task.stageId, []);
    }
    groups.get(task.stageId).push(task);
  }
  return groups;
}

/**
 * The neighbours an item lands between when moved one step left (-1) or
 * right (+1) within an ordered list.
 * @param {!Array<{id: number}>} items
 * @param {number} index Current index of the moving item.
 * @param {number} direction -1 or +1.
 * @return {?{prevId: ?number, nextId: ?number}} Null if it can't move.
 */
export function neighboursForStep(items, index, direction) {
  const target = index + direction;
  if (target < 0 || target >= items.length) {
    return null;
  }
  const others = items.filter((_, i) => i !== index);
  return {
    prevId: others[target - 1]?.id ?? null,
    nextId: others[target]?.id ?? null,
  };
}

/**
 * @param {number} count
 * @param {string} noun Singular noun.
 * @return {string} e.g. "1 task", "3 tasks".
 */
export function pluralize(count, noun) {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}
