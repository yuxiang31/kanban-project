/**
 * @fileoverview Team API calls.
 */

import {apiFetch} from './client.js';

export const listTeams = async () => (await apiFetch('/teams')).teams;

/** @param {number} teamId */
export const getTeam = async (teamId) =>
  (await apiFetch(`/teams/${teamId}`)).team;

/** @param {{name: string}} input */
export const createTeam = async (input) =>
  (await apiFetch('/teams', {method: 'POST', body: input})).team;

/** @param {number} teamId @param {string} username */
export const addMember = async (teamId, username) =>
  (
    await apiFetch(`/teams/${teamId}/members`, {
      method: 'POST',
      body: {username},
    })
  ).member;

/** @param {number} teamId @param {number} userId */
export const removeMember = (teamId, userId) =>
  apiFetch(`/teams/${teamId}/members/${userId}`, {method: 'DELETE'});

/** @param {number} teamId @param {{name: string}} input */
export const renameTeam = async (teamId, input) =>
  (await apiFetch(`/teams/${teamId}`, {method: 'PATCH', body: input})).team;

/** @param {number} teamId */
export const deleteTeam = (teamId) =>
  apiFetch(`/teams/${teamId}`, {method: 'DELETE'});
