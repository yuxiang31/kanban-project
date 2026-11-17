/**
 * @fileoverview Client-side checks mirroring the server's register schema,
 * so users get instant feedback. The server remains the authority.
 */

const USERNAME_PATTERN = /^[A-Za-z0-9_.-]+$/;

/**
 * @param {{username: string, password: string, confirm: string}} input
 * @return {?string} The first problem found, or null if valid.
 */
export function validateRegistration({username, password, confirm}) {
  if (username.length < 3 || username.length > 32) {
    return 'Username must be 3–32 characters.';
  }
  if (!USERNAME_PATTERN.test(username)) {
    return 'Username may only contain letters, numbers, dots, dashes and underscores.';
  }
  if (password.length < 8) {
    return 'Password must be at least 8 characters.';
  }
  if (password !== confirm) {
    return 'Passwords do not match.';
  }
  return null;
}
