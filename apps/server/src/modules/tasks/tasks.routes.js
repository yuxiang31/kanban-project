/**
 * @fileoverview Task routes.
 */

import {idParams, nonBlank} from '../../utils/schemas.js';
import {createTask, deleteTask, updateTask} from './tasks.service.js';

const description = {type: 'string', maxLength: 5000};

export default async function taskRoutes(app) {
  app.addHook('preHandler', app.authenticate);

  app.post(
    '/boards/:boardId/tasks',
    {
      schema: {
        params: idParams('boardId'),
        body: {
          type: 'object',
          required: ['stageId', 'title'],
          additionalProperties: false,
          properties: {
            stageId: {type: 'integer'},
            title: nonBlank(200),
            description,
          },
        },
      },
    },
    async (request, reply) => {
      const task = createTask(
        app.db,
        request.params.boardId,
        request.body,
        request.user.id,
      );
      return reply.status(201).send({task});
    },
  );

  app.patch(
    '/tasks/:taskId',
    {
      schema: {
        params: idParams('taskId'),
        body: {
          type: 'object',
          minProperties: 1,
          additionalProperties: false,
          properties: {title: nonBlank(200), description},
        },
      },
    },
    async (request) => ({
      task: updateTask(
        app.db,
        request.params.taskId,
        request.body,
        request.user.id,
      ),
    }),
  );

  app.delete(
    '/tasks/:taskId',
    {schema: {params: idParams('taskId')}},
    async (request, reply) => {
      deleteTask(app.db, request.params.taskId, request.user.id);
      return reply.status(204).send();
    },
  );
}
