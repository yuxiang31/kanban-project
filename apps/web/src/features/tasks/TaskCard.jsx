/**
 * @fileoverview A draggable task card. Click or Enter opens it; Space picks
 * it up for a keyboard move (arrows to move, Space to drop, Escape to
 * cancel).
 */

import {useSortable} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import {AvatarStack} from '../../components/Avatar.jsx';
import {listNames} from '../../utils/people.js';
import {taskDndId} from '../boards/dnd.js';

/**
 * @param {{task: !Object, assignees: !Array<!Object>, onOpen: function()}}
 *     props
 */
export default function TaskCard({task, assignees, onOpen}) {
  const {attributes, listeners, setNodeRef, transform, transition, isDragging} =
    useSortable({
      id: taskDndId(task.id),
      data: {type: 'task'},
    });

  function handleKeyDown(event) {
    if (event.key === 'Enter' && !isDragging) {
      event.preventDefault();
      onOpen();
      return;
    }
    listeners?.onKeyDown?.(event);
  }

  const label = [
    `Open task ${task.title}`,
    assignees.length > 0 &&
      `assigned to ${listNames(assignees.map((a) => a.displayName))}`,
    task.color && `colour ${task.color}`,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <div
      ref={setNodeRef}
      style={{transform: CSS.Translate.toString(transform), transition}}
      className={`task-card${isDragging ? ' is-dragging' : ''}`}
      data-color={task.color ?? undefined}
      {...attributes}
      {...listeners}
      aria-label={label}
      onClick={onOpen}
      onKeyDown={handleKeyDown}
    >
      <span className="task-title">{task.title}</span>
      <AvatarStack users={assignees} />
    </div>
  );
}
