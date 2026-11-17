/**
 * @fileoverview Auth API calls.
 */

import {apiFetch} from './client.js';

/**
 * @return {!Promise<?Object>} The logged-in user, or null if logged out.
 */
export async function fetchMe() {
  try {
    return (await apiFetch('/auth/me')).user;
  } catch (err) {
    if (err.status === 401) {
      return null;
    }
    throw err;
  }
}

/**
 * @param {{username: string, password: string}} credentials
 * @return {!Promise<!Object>} The user.
 */
export async function login(credentials) {
  return (await apiFetch('/auth/login', {method: 'POST', body: credentials}))
    .user;
}

/**
 * @param {{username: string, password: string, displayName?: string}} input
 * @return {!Promise<!Object>} The new user.
 */
export async function register(input) {
  return (await apiFetch('/auth/register', {method: 'POST', body: input})).user;
}

/** @return {!Promise<void>} */
export async function logout() {
  await apiFetch('/auth/logout', {method: 'POST'});
}
