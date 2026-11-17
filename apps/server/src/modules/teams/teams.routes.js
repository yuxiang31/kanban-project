/**
 * @fileoverview Team routes. Team changes are also pushed to the team's
 * open boards: renames update board headers, membership changes refresh
 * who can be assigned, and deleting the team deletes its boards live.
 */

import {CLOSE_BOARD_DELETED, CLOSE_FORBIDDEN} from '../../plugins/realtime.js';
import {publish} from '../../utils/events.js';
import {idParams, nonBlank} from '../../utils/schemas.js';
import {toBoardSummary} from '../boards/boards.mappers.js';
import {listBoardsOfTeam} from '../boards/boards.repository.js';
import {findUserById} from '../users/users.repository.js';
import {
  addMemberByUsername,
  createTeam,
  deleteTeam,
  getTeam,
  listTeams,
  removeMember,
  renameTeam,
} from './teams.service.js';

const memberParams = {
  type: 'object',
  properties: {
    teamId: {type: 'integer', minimum: 1},
    userId: {type: 'integer', minimum: 1},
  },
  required: ['teamId', 'userId'],
};

export default async function teamRoutes(app) {
  /** Tells every open board of a team that its member list changed. */
  function publishMembersChanged(request, teamId) {
    for (const board of listBoardsOfTeam(app.db, teamId)) {
      publish(app, request, board.id, 'team.members', {teamId});
    }
  }

  app.addHook('preHandler', app.authenticate);

  app.get('/teams', async (request) => ({
    teams: listTeams(app.db, request.user.id),
  }));

  app.post(
    '/teams',
    {
      schema: {
        body: {
          type: 'object',
          required: ['name'],
          additionalProperties: false,
          properties: {name: nonBlank(60)},
        },
      },
    },
    async (request, reply) => {
      const team = createTeam(app.db, request.body, request.user.id);
      return reply.status(201).send({team});
    },
  );

  app.get(
    '/teams/:teamId',
    {schema: {params: idParams('teamId')}},
    async (request) => ({
      team: getTeam(app.db, request.params.teamId, request.user.id),
    }),
  );

  app.patch(
    '/teams/:teamId',
    {
      schema: {
        params: idParams('teamId'),
        body: {
          type: 'object',
          required: ['name'],
          additionalProperties: false,
          properties: {name: nonBlank(60)},
        },
      },
    },
    async (request) => {
      const team = renameTeam(
        app.db,
        request.params.teamId,
        request.body,
        request.user.id,
      );
      for (const row of listBoardsOfTeam(app.db, team.id)) {
        publish(app, request, row.id, 'board.updated', {
          board: toBoardSummary(row),
        });
      }
      return {team};
    },
  );

  app.delete(
    '/teams/:teamId',
    {schema: {params: idParams('teamId')}},
    async (request, reply) => {
      const {teamId} = request.params;
      // Read the boards first: deleting the team cascades to them.
      const boards = listBoardsOfTeam(app.db, teamId);
      deleteTeam(app.db, teamId, request.user.id);
      const actorName = findUserById(app.db, request.user.id).display_name;
      for (const {id: boardId} of boards) {
        publish(app, request, boardId, 'board.deleted', {boardId, actorName});
        app.realtime.closeRoom(boardId, CLOSE_BOARD_DELETED, 'Board deleted');
      }
      return reply.status(204).send();
    },
  );

  app.post(
    '/teams/:teamId/members',
    {
      schema: {
        params: idParams('teamId'),
        body: {
          type: 'object',
          required: ['username'],
          additionalProperties: false,
          properties: {username: nonBlank(32)},
        },
      },
    },
    async (request, reply) => {
      const member = addMemberByUsername(
        app.db,
        request.params.teamId,
        request.body.username,
        request.user.id,
      );
      publishMembersChanged(request, request.params.teamId);
      return reply.status(201).send({member});
    },
  );

  app.delete(
    '/teams/:teamId/members/:userId',
    {schema: {params: memberParams}},
    async (request, reply) => {
      const {teamId, userId} = request.params;
      removeMember(app.db, teamId, userId, request.user.id);
      const boardIds = listBoardsOfTeam(app.db, teamId).map((b) => b.id);
      app.realtime.closeUser(
        boardIds,
        userId,
        CLOSE_FORBIDDEN,
        'Removed from team',
      );
      publishMembersChanged(request, teamId);
      return reply.status(204).send();
    },
  );
}
