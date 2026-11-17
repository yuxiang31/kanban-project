/**
 * @fileoverview A board's due date under its title: shown with how far
 * away it is, and set, changed or removed in place (it takes the board's
 * one-change-at-a-time lock while open).
 */

import {useId, useState} from 'react';
import * as api from '../../api/boards.js';
import ErrorMessage from '../../components/ErrorMessage.jsx';
import {useBoardMutation} from './boardQueries.js';
import {OPERATION_HINT, useBoardOperation} from './boardOperation.js';
import DueBadge from './DueBadge.jsx';

/** @param {{board: !Object}} props */
export default function BoardDueDate({board}) {
  const op = useBoardOperation('due-date');
  const fieldId = useId();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const save = useBoardMutation((dueDate) =>
    api.updateBoard(board.id, {dueDate}),
  );

  function startEditing() {
    if (op.start()) {
      setDraft(board.dueDate ?? '');
      save.reset();
      setEditing(true);
    }
  }

  function stopEditing() {
    setEditing(false);
    op.stop();
  }

  async function submit(dueDate) {
    try {
      await save.mutateAsync(dueDate);
      stopEditing();
    } catch {
      // Shown via save.error; the form stays open.
    }
  }

  if (editing) {
    return (
      <form
        className="due-date-form"
        onSubmit={(event) => {
          event.preventDefault();
          submit(draft || null);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.stopPropagation();
            stopEditing();
          }
        }}
      >
        <label htmlFor={fieldId}>Due date</label>
        <input
          id={fieldId}
          type="date"
          value={draft}
          autoFocus
          onChange={(event) => setDraft(event.target.value)}
        />
        <div className="inline-actions">
          <button
            type="submit"
            className="button primary"
            aria-label="Save due date"
            disabled={save.isPending || !draft}
          >
            Save
          </button>
          {board.dueDate && (
            <button
              type="button"
              className="button"
              aria-label="Remove due date"
              disabled={save.isPending}
              onClick={() => submit(null)}
            >
              Remove
            </button>
          )}
          <button type="button" className="button" onClick={stopEditing}>
            Cancel
          </button>
        </div>
        <ErrorMessage error={save.error} />
      </form>
    );
  }

  return (
    <div className="board-due">
      {board.dueDate && <DueBadge dueDate={board.dueDate} />}
      <button
        type="button"
        className="link-button"
        disabled={op.locked}
        title={op.locked ? OPERATION_HINT : undefined}
        onClick={startEditing}
      >
        {board.dueDate ? 'Change due date' : 'Set due date'}
      </button>
    </div>
  );
}
