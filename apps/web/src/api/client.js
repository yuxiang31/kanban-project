/**
 * @fileoverview Thin fetch wrapper for the JSON API. Sends the auth cookie
 * and turns non-2xx responses into ApiError.
 */

/**
 * Identifies this browser tab. Sent with every request so live events
 * caused by this tab can be recognised and skipped (the tab already shows
 * its own changes), while the same user's other tabs still update.
 */
export const CLIENT_ID = globalThis.crypto.randomUUID();

/** An error response from the API. */
export class ApiError extends Error {
  /**
   * @param {number} status
   * @param {string} message
   */
  constructor(status, message) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * @param {string} path Path under /api, e.g. `/boards`.
 * @param {{method?: string, body?: *}=} options
 * @return {!Promise<*>} Parsed JSON, or null for 204 responses.
 */
export async function apiFetch(path, {method = 'GET', body} = {}) {
  const hasBody = body !== undefined;
  const res = await fetch(`/api${path}`, {
    method,
    credentials: 'include',
    headers: {
      'X-Client-Id': CLIENT_ID,
      ...(hasBody && {'Content-Type': 'application/json'}),
    },
    body: hasBody ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) {
    return null;
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(
      res.status,
      data?.message ?? `Request failed (${res.status}).`,
    );
  }
  return data;
}
