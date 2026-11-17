/**
 * @fileoverview HTTP error helpers understood by the app's error handler.
 */

/** An error carrying an HTTP status code. */
export class HttpError extends Error {
  /**
   * @param {number} statusCode
   * @param {string} message
   */
  constructor(statusCode, message) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
  }
}

export const badRequest = (msg = 'Bad request') => new HttpError(400, msg);
export const unauthorized = (msg = 'Unauthorized') => new HttpError(401, msg);
export const forbidden = (msg = 'Forbidden') => new HttpError(403, msg);
export const notFound = (msg = 'Not found') => new HttpError(404, msg);
export const conflict = (msg = 'Conflict') => new HttpError(409, msg);
