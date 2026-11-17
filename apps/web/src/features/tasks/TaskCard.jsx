/**
 * @fileoverview A draggable task card. Click or Enter opens it; Space picks
 * it up for a keyboard move (arrows to move, Space to drop, Escape to
 * cancel).
 */

import {useSortable} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import {taskDndId} from '../boards/dnd.js';

/**
 * @param {{task: !Object, onOpen: function()}} props
 */
export default function TaskCard({task, onOpen}) {
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

  return (
    <div
      ref={setNodeRef}
      style={{transform: CSS.Translate.toString(transform), transition}}
      className={`task-card${isDragging ? ' is-dragging' : ''}`}
      {...attributes}
      {...listeners}
      aria-label={`Open task ${task.title}`}
      onClick={onOpen}
      onKeyDown={handleKeyDown}
    >
      {task.title}
    </div>
  );
}
