/**
 * @fileoverview Board, stage and task API calls.
 */

import {apiFetch} from './client.js';

export const listBoards = async () => (await apiFetch('/boards')).boards;

/** @param {number} boardId */
export const getBoard = async (boardId) =>
  (await apiFetch(`/boards/${boardId}`)).board;

/** @param {{name: string}} input */
export const createBoard = async (input) =>
  (await apiFetch('/boards', {method: 'POST', body: input})).board;

/** @param {number} boardId @param {{name: string}} input */
export const renameBoard = async (boardId, input) =>
  (await apiFetch(`/boards/${boardId}`, {method: 'PATCH', body: input})).board;

/** @param {number} boardId */
export const deleteBoard = (boardId) =>
  apiFetch(`/boards/${boardId}`, {method: 'DELETE'});

/** @param {number} boardId @param {{name: string}} input */
export const createStage = async (boardId, input) =>
  (await apiFetch(`/boards/${boardId}/stages`, {method: 'POST', body: input}))
    .stage;

/**
 * @param {number} stageId
 * @param {{name?: string, prevId?: ?number, nextId?: ?number}} input
 */
export const updateStage = async (stageId, input) =>
  (await apiFetch(`/stages/${stageId}`, {method: 'PATCH', body: input})).stage;

/** @param {number} stageId */
export const deleteStage = (stageId) =>
  apiFetch(`/stages/${stageId}`, {method: 'DELETE'});

/**
 * @param {number} boardId
 * @param {{stageId: number, title: string, description?: string}} input
 */
export const createTask = async (boardId, input) =>
  (await apiFetch(`/boards/${boardId}/tasks`, {method: 'POST', body: input}))
    .task;

/** @param {number} taskId @param {!Object} input */
export const updateTask = async (taskId, input) =>
  (await apiFetch(`/tasks/${taskId}`, {method: 'PATCH', body: input})).task;

/** @param {number} taskId */
export const deleteTask = (taskId) =>
  apiFetch(`/tasks/${taskId}`, {method: 'DELETE'});

/**
 * Adds a to-do at the end of a task's checklist.
 * @param {number} taskId
 * @param {string} text
 * @return {!Promise<{item: !Object, task: !Object}>}
 */
export const addChecklistItem = (taskId, text) =>
  apiFetch(`/tasks/${taskId}/checklist`, {method: 'POST', body: {text}});

/**
 * Ticks/unticks and/or renames a checklist item.
 * @param {number} itemId
 * @param {{text?: string, done?: boolean}} input
 * @return {!Promise<{item: !Object, task: !Object}>}
 */
export const updateChecklistItem = (itemId, input) =>
  apiFetch(`/checklist/${itemId}`, {method: 'PATCH', body: input});

/** @param {number} itemId */
export const deleteChecklistItem = (itemId) =>
  apiFetch(`/checklist/${itemId}`, {method: 'DELETE'});

/**
 * Sets who handles a task (replaces the previous set).
 * @param {number} taskId
 * @param {!Array<number>} userIds
 */
export const setAssignees = async (taskId, userIds) =>
  (
    await apiFetch(`/tasks/${taskId}/assignees`, {
      method: 'PUT',
      body: {userIds},
    })
  ).task;

/**
 * Renames a board and/or changes its colour (null clears it).
 * @param {number} boardId
 * @param {{name?: string, color?: ?string}} input
 */
export const updateBoard = async (boardId, input) =>
  (await apiFetch(`/boards/${boardId}`, {method: 'PATCH', body: input})).board;
