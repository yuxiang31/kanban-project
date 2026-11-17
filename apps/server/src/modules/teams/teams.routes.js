/**
 * @fileoverview Team routes.
 */

import {idParams, nonBlank} from '../../utils/schemas.js';
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
    async (request) => ({
      team: renameTeam(
        app.db,
        request.params.teamId,
        request.body,
        request.user.id,
      ),
    }),
  );

  app.delete(
    '/teams/:teamId',
    {schema: {params: idParams('teamId')}},
    async (request, reply) => {
      deleteTeam(app.db, request.params.teamId, request.user.id);
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
      return reply.status(201).send({member});
    },
  );

  app.delete(
    '/teams/:teamId/members/:userId',
    {schema: {params: memberParams}},
    async (request, reply) => {
      removeMember(
        app.db,
        request.params.teamId,
        request.params.userId,
        request.user.id,
      );
      return reply.status(204).send();
    },
  );
}
