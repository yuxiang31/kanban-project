/**
 * @fileoverview A draggable task card. Click or Enter opens it; Space picks
 * it up for a keyboard move (arrows to move, Space to drop, Escape to
 * cancel).
 */

import {useSortable} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import {AvatarStack} from '../../components/Avatar.jsx';
import {listNames} from '../../utils/people.js';
import {useBoardOperation} from '../boards/boardOperation.js';
import {taskDndId} from '../boards/dnd.js';

/**
 * @param {{task: !Object, assignees: !Array<!Object>, onOpen: function()}}
 *     props
 */
export default function TaskCard({task, assignees, onOpen}) {
  // While another change is open on the board, the card can't be opened
  // or dragged.
  const {locked} = useBoardOperation();
  const {attributes, listeners, setNodeRef, transform, transition, isDragging} =
    useSortable({
      id: taskDndId(task.id),
      data: {type: 'task'},
      disabled: locked,
    });

  function open() {
    if (!locked) {
      onOpen();
    }
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' && !isDragging) {
      event.preventDefault();
      open();
      return;
    }
    listeners?.onKeyDown?.(event);
  }

  /** The description as one line; CSS shows at most two lines of it. */
  const preview = task.description?.replace(/\s+/g, ' ').trim();

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
      aria-disabled={locked || undefined}
      onClick={open}
      onKeyDown={handleKeyDown}
    >
      <span className="task-main">
        <span className="task-title">{task.title}</span>
        {preview && <span className="task-desc">{preview}</span>}
      </span>
      <AvatarStack users={assignees} />
    </div>
  );
}
