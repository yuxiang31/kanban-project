/**
 * @fileoverview Shared JSON schema fragments.
 */

/**
 * Params schema for a single integer id.
 * @param {string} key
 * @return {!Object}
 */
export function idParams(key) {
  return {
    type: 'object',
    properties: {[key]: {type: 'integer', minimum: 1}},
    required: [key],
  };
}

/**
 * A string with at least one non-space character.
 * @param {number} maxLength
 * @return {!Object}
 */
export function nonBlank(maxLength) {
  return {type: 'string', minLength: 1, maxLength, pattern: '\\S'};
}

/**
 * A neighbour id for reordering: an id, or null for "at that end". A type
 * list (not anyOf) so Fastify's type coercion leaves null as null instead
 * of turning it into 0.
 */
export const neighbourId = {type: ['integer', 'null']};
