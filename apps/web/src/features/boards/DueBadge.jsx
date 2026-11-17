/**
 * @fileoverview "Due 1 Dec 2026 · in 5 days", toned by how close it is.
 */

import {CalendarIcon} from '../../components/Icons.jsx';
import {describeDueDate} from './dueDate.js';

/** @param {{dueDate: string}} props YYYY-MM-DD */
export default function DueBadge({dueDate}) {
  const {date, relative, tone} = describeDueDate(dueDate);
  return (
    <span className="due-badge" data-tone={tone}>
      <CalendarIcon />
      Due {date} · {relative}
    </span>
  );
}
