import {describe, expect, it} from 'vitest';
import {
  HttpError,
  badRequest,
  conflict,
  forbidden,
  notFound,
  unauthorized,
} from '../src/utils/errors.js';

describe('error helpers', () => {
  it.each([
    [badRequest, 400, 'Bad request'],
    [unauthorized, 401, 'Unauthorized'],
    [forbidden, 403, 'Forbidden'],
    [notFound, 404, 'Not found'],
    [conflict, 409, 'Conflict'],
  ])('%o builds an HttpError', (make, status, defaultMessage) => {
    const err = make();
    expect(err).toBeInstanceOf(HttpError);
    expect(err.statusCode).toBe(status);
    expect(err.message).toBe(defaultMessage);
    expect(make('Custom').message).toBe('Custom');
  });
});
