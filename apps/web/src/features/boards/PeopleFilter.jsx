/**
 * @fileoverview Toggle chips for filtering a board by who handles tasks.
 */

import {Avatar} from '../../components/Avatar.jsx';
import {pluralize} from './boardModel.js';
import {UNASSIGNED} from './peopleFilter.js';

/**
 * @param {{
 *   members: !Array<!Object>,
 *   selected: !Set<(number|string)>,
 *   onChange: function(!Set<(number|string)>),
 *   visibleCount: number,
 *   totalCount: number,
 * }} props
 */
export default function PeopleFilter({
  members,
  selected,
  onChange,
  visibleCount,
  totalCount,
}) {
  function toggle(value) {
    const next = new Set(selected);
    if (next.has(value)) {
      next.delete(value);
    } else {
      next.add(value);
    }
    onChange(next);
  }

  return (
    <div className="people-filter">
      <div role="group" aria-labelledby="people-filter-label" className="chips">
        <span id="people-filter-label" className="muted small">
          Filter by person
        </span>
        {members.map((member) => (
          <button
            key={member.id}
            type="button"
            className="chip"
            aria-pressed={selected.has(member.id)}
            onClick={() => toggle(member.id)}
          >
            <Avatar user={member} />
            {member.displayName}
          </button>
        ))}
        <button
          type="button"
          className="chip"
          aria-pressed={selected.has(UNASSIGNED)}
          onClick={() => toggle(UNASSIGNED)}
        >
          Unassigned
        </button>
      </div>
      {selected.size > 0 && (
        <p className="muted small filter-summary">
          <span>{`Showing ${visibleCount} of ${pluralize(totalCount, 'task')}`}</span>
          <button
            type="button"
            className="link-button"
            onClick={() => onChange(new Set())}
          >
            Clear filter
          </button>
        </p>
      )}
    </div>
  );
}
