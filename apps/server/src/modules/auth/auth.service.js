/**
 * @fileoverview Registration and login rules.
 */

import bcrypt from 'bcryptjs';
import {conflict, unauthorized} from '../../utils/errors.js';
import {
  findUserById,
  findUserByUsername,
  insertUser,
  toPublicUser,
} from '../users/users.repository.js';

const INVALID_LOGIN = 'Invalid username or password.';

/**
 * Hash compared against when the username is unknown, so a failed login
 * takes about as long whether or not the user exists.
 * @type {!Map<number, string>}
 */
const dummyHashes = new Map();

/**
 * @param {number} rounds
 * @return {string}
 */
function dummyHash(rounds) {
  if (!dummyHashes.has(rounds)) {
    dummyHashes.set(rounds, bcrypt.hashSync('dummy-password', rounds));
  }
  return dummyHashes.get(rounds);
}

/**
 * @param {!Object} db
 * @param {{username: string, password: string, displayName?: string}} input
 * @param {number} rounds bcrypt cost factor.
 * @return {!Promise<!Object>} The public user.
 */
export async function register(db, input, rounds) {
  const username = input.username.trim();
  if (findUserByUsername(db, username)) {
    throw conflict('That username is taken.');
  }
  const passwordHash = await bcrypt.hash(input.password, rounds);
  const displayName = input.displayName?.trim() || username;
  try {
    return toPublicUser(insertUser(db, {username, passwordHash, displayName}));
  } catch (err) {
    // Lost a race with a concurrent registration for the same name.
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      throw conflict('That username is taken.');
    }
    throw err;
  }
}

/**
 * @param {!Object} db
 * @param {{username: string, password: string}} input
 * @param {number} rounds bcrypt cost factor, used for the dummy hash.
 * @return {!Promise<!Object>} The public user.
 */
export async function login(db, {username, password}, rounds) {
  const row = findUserByUsername(db, username.trim());
  const ok = await bcrypt.compare(
    password,
    row?.password_hash ?? dummyHash(rounds),
  );
  if (!row || !ok) {
    throw unauthorized(INVALID_LOGIN);
  }
  return toPublicUser(row);
}

/**
 * @param {!Object} db
 * @param {number} userId
 * @return {!Object} The public user.
 */
export function currentUser(db, userId) {
  const row = findUserById(db, userId);
  if (!row) {
    throw unauthorized('Please log in.');
  }
  return toPublicUser(row);
}
