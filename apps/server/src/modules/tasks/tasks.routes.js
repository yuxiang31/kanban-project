/**
 * @fileoverview Task routes.
 */

import {publish} from '../../utils/events.js';
import {colorSchema} from '../../utils/palette.js';
import {idParams, neighbourId, nonBlank} from '../../utils/schemas.js';
import {
  addChecklistItem,
  createTask,
  deleteChecklistItem,
  deleteTask,
  setAssignees,
  updateChecklistItem,
  updateTask,
} from './tasks.service.js';

const description = {type: 'string', maxLength: 5000};

/** One to-do on a task's checklist. */
const itemText = nonBlank(300);

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
            color: colorSchema,
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
            color: colorSchema,
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

  app.post(
    '/tasks/:taskId/checklist',
    {
      schema: {
        params: idParams('taskId'),
        body: {
          type: 'object',
          required: ['text'],
          additionalProperties: false,
          properties: {text: itemText},
        },
      },
    },
    async (request, reply) => {
      const result = addChecklistItem(
        app.db,
        request.params.taskId,
        request.body.text,
        request.user.id,
      );
      publish(app, request, result.task.boardId, 'task.updated', {
        task: result.task,
      });
      return reply.status(201).send(result);
    },
  );

  app.patch(
    '/checklist/:itemId',
    {
      schema: {
        params: idParams('itemId'),
        body: {
          type: 'object',
          minProperties: 1,
          additionalProperties: false,
          properties: {text: itemText, done: {type: 'boolean'}},
        },
      },
    },
    async (request) => {
      const result = updateChecklistItem(
        app.db,
        request.params.itemId,
        request.body,
        request.user.id,
      );
      publish(app, request, result.task.boardId, 'task.updated', {
        task: result.task,
      });
      return result;
    },
  );

  app.delete(
    '/checklist/:itemId',
    {schema: {params: idParams('itemId')}},
    async (request, reply) => {
      const task = deleteChecklistItem(
        app.db,
        request.params.itemId,
        request.user.id,
      );
      publish(app, request, task.boardId, 'task.updated', {task});
      return reply.status(204).send();
    },
  );
}
