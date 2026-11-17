/**
 * @fileoverview Row → API shape conversions for boards, stages and tasks.
 */

/**
 * @param {!Object} row A boards row joined with `team_name`.
 */
export function toBoardSummary(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    teamId: row.team_id,
    color: row.color,
    dueDate: row.due_date,
    team: row.team_id == null ? null : {id: row.team_id, name: row.team_name},
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

/** @param {!Object} row */
export function toStage(row) {
  return {
    id: row.id,
    boardId: row.board_id,
    name: row.name,
    color: row.color,
    position: row.position,
  };
}

/** @param {!Object} row A task_checklist_items row. */
export function toChecklistItem(row) {
  return {id: row.id, text: row.text, done: row.done === 1};
}

/**
 * @param {!Object} row
 * @param {!Array<number>=} assigneeIds
 * @param {!Array<!Object>=} checklist task_checklist_items rows, in order.
 */
export function toTask(row, assigneeIds = [], checklist = []) {
  return {
    id: row.id,
    boardId: row.board_id,
    stageId: row.stage_id,
    title: row.title,
    description: row.description,
    color: row.color,
    position: row.position,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    assigneeIds,
    checklist: checklist.map(toChecklistItem),
  };
}
