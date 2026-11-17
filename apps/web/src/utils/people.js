/**
 * @fileoverview Small helpers for showing people.
 */

/** Distinct avatar colors with white text at AA contrast. */
const AVATAR_COLORS = [
  '#2f6fde',
  '#b5446e',
  '#2e8540',
  '#a35d00',
  '#6d4fc2',
  '#00798c',
  '#c0392b',
  '#5a6472',
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
