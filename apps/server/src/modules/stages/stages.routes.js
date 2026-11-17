/**
 * @fileoverview Stage routes.
 */

import {idParams, neighbourId, nonBlank} from '../../utils/schemas.js';
import {createStage, deleteStage, updateStage} from './stages.service.js';

export default async function stageRoutes(app) {
  app.addHook('preHandler', app.authenticate);

  app.post(
    '/boards/:boardId/stages',
    {
      schema: {
        params: idParams('boardId'),
        body: {
          type: 'object',
          required: ['name'],
          additionalProperties: false,
          properties: {name: nonBlank(50)},
        },
      },
    },
    async (request, reply) => {
      const stage = createStage(
        app.db,
        request.params.boardId,
        request.body,
        request.user.id,
      );
      return reply.status(201).send({stage});
    },
  );

  app.patch(
    '/stages/:stageId',
    {
      schema: {
        params: idParams('stageId'),
        body: {
          type: 'object',
          minProperties: 1,
          additionalProperties: false,
          properties: {
            name: nonBlank(50),
            prevId: neighbourId,
            nextId: neighbourId,
          },
        },
      },
    },
    async (request) => ({
      stage: updateStage(
        app.db,
        request.params.stageId,
        request.body,
        request.user.id,
      ),
    }),
  );

  app.delete(
    '/stages/:stageId',
    {schema: {params: idParams('stageId')}},
    async (request, reply) => {
      deleteStage(app.db, request.params.stageId, request.user.id);
      return reply.status(204).send();
    },
  );
}
