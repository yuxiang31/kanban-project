/**
 * @fileoverview Quick-add for tasks at the bottom of a stage: type a title
 * and the new task opens (via `onCreated`) for its details. While open, the
 * form holds the board's one-change-at-a-time lock.
 */

import {useId, useState} from 'react';
import * as api from '../../api/boards.js';
import ErrorMessage from '../../components/ErrorMessage.jsx';
import {PlusIcon} from '../../components/Icons.jsx';
import {useBoardMutation} from '../boards/boardQueries.js';
import {OPERATION_HINT, useBoardOperation} from '../boards/boardOperation.js';

/**
 * @param {{boardId: number, stage: !Object,
 *     onCreated: function(!Object)}} props `onCreated` gets the new task.
 */
export default function AddTaskForm({boardId, stage, onCreated}) {
  const inputId = useId();
  const op = useBoardOperation(`add-task:${stage.id}`);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const create = useBoardMutation((input) => api.createTask(boardId, input));

  function close() {
    setOpen(false);
    op.stop();
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      return;
    }
    try {
      const task = await create.mutateAsync({
        stageId: stage.id,
        title: trimmed,
      });
      setTitle('');
      close();
      onCreated(task);
    } catch {
      // Shown via create.error.
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        className="add-task-button"
        aria-label={`Add task to ${stage.name}`}
        disabled={op.locked}
        title={op.locked ? OPERATION_HINT : undefined}
        onClick={() => op.start() && setOpen(true)}
      >
        <PlusIcon />
        Add task
      </button>
    );
  }
  return (
    <form className="add-task-form" onSubmit={handleSubmit}>
      <label htmlFor={inputId} className="visually-hidden">
        Task title
      </label>
      <input
        id={inputId}
        value={title}
        maxLength={200}
        placeholder="Task title"
        autoFocus
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            close();
          }
        }}
      />
      <ErrorMessage error={create.error} />
      <div className="inline-actions">
        <button
          type="submit"
          className="button primary"
          disabled={!title.trim() || create.isPending}
        >
          Add
        </button>
        <button type="button" className="button" onClick={() => close()}>
          Cancel
        </button>
      </div>
    </form>
  );
}
