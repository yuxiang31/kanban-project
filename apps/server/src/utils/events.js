/**
 * @fileoverview Helpers for publishing board events from routes.
 */

const CLIENT_ID = /^[A-Za-z0-9_-]{1,64}$/;

/**
 * The sending tab's id from `X-Client-Id`, if it is a short token.
 * @param {!Object} request
 * @return {?string}
 */
export function eventOrigin(request) {
  const id = request.headers['x-client-id'];
  return typeof id === 'string' && CLIENT_ID.test(id) ? id : null;
}

/**
 * Broadcasts an event caused by `request` to everyone watching a board.
 * @param {!Object} app
 * @param {!Object} request
 * @param {number} boardId
 * @param {string} type
 * @param {*} payload
 */
export function publish(app, request, boardId, type, payload) {
  app.realtime.broadcast(boardId, {
    type,
    actorId: request.user.id,
    origin: eventOrigin(request),
    payload,
  });
}
