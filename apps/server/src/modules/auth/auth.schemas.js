/**
 * @fileoverview JSON schemas for the auth routes.
 */

const username = {
  type: 'string',
  minLength: 3,
  maxLength: 32,
  pattern: '^[A-Za-z0-9_.-]+$',
};
const password = {type: 'string', minLength: 8, maxLength: 128};

export const registerSchema = {
  body: {
    type: 'object',
    required: ['username', 'password'],
    additionalProperties: false,
    properties: {
      username,
      password,
      displayName: {type: 'string', maxLength: 60},
    },
  },
};

export const loginSchema = {
  body: {
    type: 'object',
    required: ['username', 'password'],
    additionalProperties: false,
    properties: {
      username: {type: 'string', minLength: 1, maxLength: 32},
      password: {type: 'string', minLength: 1, maxLength: 128},
    },
  },
};
