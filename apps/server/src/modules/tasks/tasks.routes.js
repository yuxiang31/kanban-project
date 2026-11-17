/**
 * @fileoverview Task routes.
 */

import {publish} from '../../utils/events.js';
import {idParams, neighbourId, nonBlank} from '../../utils/schemas.js';
import {
  createTask,
  deleteTask,
  setAssignees,
  updateTask,
} from './tasks.service.js';

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
      publish(app, request, task.boardId, 'task.created', {task});
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
          properties: {
            title: nonBlank(200),
            description,
            stageId: {type: 'integer'},
            prevId: neighbourId,
            nextId: neighbourId,
          },
        },
      },
    },
    async (request) => {
      const task = updateTask(
        app.db,
        request.params.taskId,
        request.body,
        request.user.id,
      );
      publish(app, request, task.boardId, 'task.updated', {task});
      return {task};
    },
  );

  app.delete(
    '/tasks/:taskId',
    {schema: {params: idParams('taskId')}},
    async (request, reply) => {
      const task = deleteTask(app.db, request.params.taskId, request.user.id);
      publish(app, request, task.boardId, 'task.deleted', {taskId: task.id});
      return reply.status(204).send();
    },
  );

  app.put(
    '/tasks/:taskId/assignees',
    {
      schema: {
        params: idParams('taskId'),
        body: {
          type: 'object',
          required: ['userIds'],
          additionalProperties: false,
          properties: {
            userIds: {
              type: 'array',
              maxItems: 50,
              items: {type: 'integer', minimum: 1},
            },
          },
        },
      },
    },
    async (request) => {
      const task = setAssignees(
        app.db,
        request.params.taskId,
        request.body.userIds,
        request.user.id,
      );
      publish(app, request, task.boardId, 'task.updated', {task});
      return {task};
    },
  );
}
