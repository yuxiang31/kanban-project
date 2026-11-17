/**
 * @fileoverview Board routes.
 */

import {idParams, nonBlank} from '../../utils/schemas.js';
import {
  createBoard,
  deleteBoard,
  getBoard,
  listBoards,
  renameBoard,
} from './boards.service.js';

const nameBody = {
  type: 'object',
  required: ['name'],
  additionalProperties: false,
  properties: {name: nonBlank(100)},
};

export default async function boardRoutes(app) {
  app.addHook('preHandler', app.authenticate);

  app.get('/boards', async (request) => ({
    boards: listBoards(app.db, request.user.id),
  }));

  app.post('/boards', {schema: {body: nameBody}}, async (request, reply) => {
    const board = createBoard(app.db, request.body, request.user.id);
    return reply.status(201).send({board});
  });

  app.get(
    '/boards/:boardId',
    {schema: {params: idParams('boardId')}},
    async (request) => ({
      board: getBoard(app.db, request.params.boardId, request.user.id),
    }),
  );

  app.patch(
    '/boards/:boardId',
    {schema: {params: idParams('boardId'), body: nameBody}},
    async (request) => ({
      board: renameBoard(
        app.db,
        request.params.boardId,
        request.body,
        request.user.id,
      ),
    }),
  );

  app.delete(
    '/boards/:boardId',
    {schema: {params: idParams('boardId')}},
    async (request, reply) => {
      deleteBoard(app.db, request.params.boardId, request.user.id);
      return reply.status(204).send();
    },
  );
}
