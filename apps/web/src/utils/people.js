/**
 * @fileoverview Small helpers for showing people.
 */

/**
 * Soft tints that tell people apart while staying quiet (contract D7).
 * Initials are ink (#17191c) on every tint, all above 12:1 contrast.
 */
const AVATAR_COLORS = [
  '#dfe9f7',
  '#e3f1e6',
  '#fbe1d1',
  '#ece4f6',
  '#f7e3ea',
  '#dff0f1',
  '#f3efd9',
  '#e6e7eb',
];

/**
 * @param {string} displayName
 * @return {string} One or two capital letters, or "?" if empty.
 */
export function initials(displayName) {
  const words = displayName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return '?';
  }
  const first = words[0][0];
  const last = words.length > 1 ? words.at(-1)[0] : '';
  return (first + last).toUpperCase();
}

/**
 * @param {number} userId
 * @return {string} A stable background color for that user.
 */
export function avatarColor(userId) {
  return AVATAR_COLORS[userId % AVATAR_COLORS.length];
}

/**
 * @param {!Array<string>} names
 * @return {string} "A", "A and B", "A, B and C".
 */
export function listNames(names) {
  if (names.length <= 1) {
    return names[0] ?? '';
  }
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
}
