/**
 * @fileoverview Team rules.
 *
 * - Anyone can create a team; they become its owner and first member.
 *   A team has exactly one owner.
 * - Members can see the team and its members. Non-members get 404.
 * - Only the owner renames or deletes the team (deleting removes its
 *   boards), adds members (by username) or removes others.
 * - A member may leave; the owner may not (the team would be orphaned).
 * - Leaving drops the member's task assignments on the team's boards.
 */

import {badRequest, conflict, forbidden, notFound} from '../../utils/errors.js';
import {findUserByUsername, toPublicUser} from '../users/users.repository.js';
import * as repo from './teams.repository.js';

/**
 * Returns the team if the user is a member; otherwise throws 404.
 * @param {!Object} db
 * @param {number} teamId
 * @param {number} userId
 * @return {!Object} The teams row.
 */
export function assertTeamMember(db, teamId, userId) {
  const team = repo.findTeam(db, teamId);
  if (!team || !repo.isMember(db, teamId, userId)) {
    throw notFound('Team not found.');
  }
  return team;
}

/**
 * @param {!Object} db
 * @param {number} teamId
 * @param {number} userId
 * @return {!Object} The teams row.
 */
function assertTeamOwner(db, teamId, userId) {
  const team = assertTeamMember(db, teamId, userId);
  if (team.owner_id !== userId) {
    throw forbidden('Only the team owner can do that.');
  }
  return team;
}

/**
 * @param {!Object} db
 * @param {!Object} team A teams row.
 * @param {number} userId
 * @return {!Object}
 */
function teamDetail(db, team, userId) {
  return {
    id: team.id,
    name: team.name,
    ownerId: team.owner_id,
    isOwner: team.owner_id === userId,
    boardCount: repo.countBoards(db, team.id),
    members: repo.listMembers(db, team.id).map(toPublicUser),
  };
}

/**
 * @param {!Object} db
 * @param {number} userId
 * @return {!Array<!Object>}
 */
export function listTeams(db, userId) {
  return repo.listTeamsForUser(db, userId).map((row) => ({
    id: row.id,
    name: row.name,
    ownerId: row.owner_id,
    isOwner: row.owner_id === userId,
    memberCount: row.member_count,
  }));
}

/**
 * @param {!Object} db
 * @param {{name: string}} input
 * @param {number} userId
 * @return {!Object}
 */
export function createTeam(db, {name}, userId) {
  const team = db.transaction(() => {
    const row = repo.insertTeam(db, {name: name.trim(), ownerId: userId});
    repo.addMember(db, row.id, userId);
    return row;
  })();
  return teamDetail(db, team, userId);
}

/**
 * @param {!Object} db
 * @param {number} teamId
 * @param {number} userId
 * @return {!Object}
 */
export function getTeam(db, teamId, userId) {
  return teamDetail(db, assertTeamMember(db, teamId, userId), userId);
}

/**
 * @param {!Object} db
 * @param {number} teamId
 * @param {{name: string}} input
 * @param {number} actorId
 * @return {!Object}
 */
export function renameTeam(db, teamId, {name}, actorId) {
  assertTeamOwner(db, teamId, actorId);
  return teamDetail(db, repo.renameTeam(db, teamId, name.trim()), actorId);
}

/**
 * Deletes the team and all of its boards.
 * @param {!Object} db
 * @param {number} teamId
 * @param {number} actorId
 */
export function deleteTeam(db, teamId, actorId) {
  assertTeamOwner(db, teamId, actorId);
  repo.deleteTeam(db, teamId);
}

/**
 * @param {!Object} db
 * @param {number} teamId
 * @param {string} username
 * @param {number} actorId
 * @return {!Object} The added member.
 */
export function addMemberByUsername(db, teamId, username, actorId) {
  assertTeamOwner(db, teamId, actorId);
  const user = findUserByUsername(db, username.trim());
  if (!user) {
    throw notFound(`No user named "${username.trim()}".`);
  }
  if (repo.isMember(db, teamId, user.id)) {
    throw conflict(`${user.username} is already in this team.`);
  }
  repo.addMember(db, teamId, user.id);
  return toPublicUser(user);
}

/**
 * Removes a member (by the owner) or leaves the team (by the member).
 * @param {!Object} db
 * @param {number} teamId
 * @param {number} memberId
 * @param {number} actorId
 */
export function removeMember(db, teamId, memberId, actorId) {
  const team = assertTeamMember(db, teamId, actorId);
  if (memberId === team.owner_id) {
    throw badRequest('The owner cannot leave the team.');
  }
  if (actorId !== team.owner_id && actorId !== memberId) {
    throw forbidden('Only the team owner can remove other members.');
  }
  if (!repo.isMember(db, teamId, memberId)) {
    throw notFound('That user is not in this team.');
  }
  db.transaction(() => {
    repo.removeAssignmentsOnTeamBoards(db, teamId, memberId);
    repo.removeMember(db, teamId, memberId);
  })();
}
