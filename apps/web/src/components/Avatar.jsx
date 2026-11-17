/**
 * @fileoverview Initials avatars. They are decorative: whoever renders them
 * also names the people in text or an accessible label.
 */

import {avatarColor, initials} from '../utils/people.js';

/** @param {{user: !Object}} props */
export function Avatar({user}) {
  return (
    <span
      className="avatar"
      style={{background: avatarColor(user.id)}}
      title={user.displayName}
      aria-hidden="true"
    >
      {initials(user.displayName)}
    </span>
  );
}

/**
 * Up to `max` avatars, then "+N".
 * @param {{users: !Array<!Object>, max?: number}} props
 */
export function AvatarStack({users, max = 3}) {
  if (users.length === 0) {
    return null;
  }
  const shown = users.length > max ? users.slice(0, max - 1) : users;
  const hidden = users.length - shown.length;
  return (
    <span className="avatar-stack" aria-hidden="true">
      {shown.map((user) => (
        <Avatar key={user.id} user={user} />
      ))}
      {hidden > 0 && <span className="avatar more">+{hidden}</span>}
    </span>
  );
}
