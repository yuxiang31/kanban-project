/**
 * @fileoverview Stage routes.
 */

import {publish} from '../../utils/events.js';
import {colorSchema} from '../../utils/palette.js';
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
      publish(app, request, stage.boardId, 'stage.created', {stage});
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
            color: colorSchema,
            prevId: neighbourId,
            nextId: neighbourId,
          },
        },
      },
    },
    async (request) => {
      const stage = updateStage(
        app.db,
        request.params.stageId,
        request.body,
        request.user.id,
      );
      publish(app, request, stage.boardId, 'stage.updated', {stage});
      return {stage};
    },
  );

  app.delete(
    '/stages/:stageId',
    {schema: {params: idParams('stageId')}},
    async (request, reply) => {
      const stage = deleteStage(
        app.db,
        request.params.stageId,
        request.user.id,
      );
      publish(app, request, stage.boardId, 'stage.deleted', {
        stageId: stage.id,
      });
      return reply.status(204).send();
    },
  );
}
