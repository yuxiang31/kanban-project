/**
 * @fileoverview The board's "filter by person" state. It lives in the URL
 * (`?people=1,3,unassigned`) so a filtered view can be shared or reloaded.
 */

export const UNASSIGNED = 'unassigned';
export const PEOPLE_PARAM = 'people';

/**
 * @param {?string} value The `people` query value.
 * @return {!Set<(number|string)>} User ids and/or UNASSIGNED.
 */
export function parsePeopleFilter(value) {
  const selected = new Set();
  for (const part of (value ?? '').split(',')) {
    if (part === UNASSIGNED) {
      selected.add(UNASSIGNED);
    } else if (/^\d+$/.test(part)) {
      selected.add(Number(part));
    }
  }
  return selected;
}

/**
 * @param {!Set<(number|string)>} selected
 * @return {string} Ids in order, then "unassigned".
 */
export function serializePeopleFilter(selected) {
  const ids = [...selected]
    .filter((v) => v !== UNASSIGNED)
    .sort((a, b) => a - b);
  return [...ids, ...(selected.has(UNASSIGNED) ? [UNASSIGNED] : [])].join(',');
}

/**
 * Keeps tasks handled by any selected person (or with nobody, if
 * UNASSIGNED is selected). An empty selection keeps everything.
 * @param {!Array<!Object>} tasks
 * @param {!Set<(number|string)>} selected
 * @return {!Array<!Object>}
 */
export function filterTasks(tasks, selected) {
  if (selected.size === 0) {
    return tasks;
  }
  return tasks.filter((task) =>
    task.assigneeIds.length === 0
      ? selected.has(UNASSIGNED)
      : task.assigneeIds.some((id) => selected.has(id)),
  );
}
