/**
 * @fileoverview Quick-add for tasks at the bottom of a stage. Stays open
 * after each add so several tasks can be typed in a row.
 */

import {useId, useRef, useState} from 'react';
import * as api from '../../api/boards.js';
import ErrorMessage from '../../components/ErrorMessage.jsx';
import {useBoardMutation} from '../boards/boardQueries.js';

/** @param {{boardId: number, stage: !Object}} props */
export default function AddTaskForm({boardId, stage}) {
  const inputId = useId();
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const create = useBoardMutation((input) => api.createTask(boardId, input));

  async function handleSubmit(event) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      return;
    }
    try {
      await create.mutateAsync({stageId: stage.id, title: trimmed});
      setTitle('');
      inputRef.current?.focus();
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
        onClick={() => setOpen(true)}
      >
        + Add task
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
        ref={inputRef}
        value={title}
        maxLength={200}
        placeholder="Task title"
        autoFocus
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setOpen(false);
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
        <button type="button" className="button" onClick={() => setOpen(false)}>
          Done
        </button>
      </div>
    </form>
  );
}
