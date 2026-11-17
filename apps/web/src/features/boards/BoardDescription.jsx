/**
 * @fileoverview What a board is for: shown under its title, and edited in
 * place (it takes the board's one-change-at-a-time lock while open).
 */

import {useId, useState} from 'react';
import * as api from '../../api/boards.js';
import ErrorMessage from '../../components/ErrorMessage.jsx';
import {useBoardMutation} from './boardQueries.js';
import {OPERATION_HINT, useBoardOperation} from './boardOperation.js';

const MAX_LENGTH = 1000;

/** @param {{board: !Object}} props */
export default function BoardDescription({board}) {
  const op = useBoardOperation('describe-board');
  const fieldId = useId();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const save = useBoardMutation((description) =>
    api.updateBoard(board.id, {description}),
  );

  function startEditing() {
    if (op.start()) {
      setDraft(board.description ?? '');
      save.reset();
      setEditing(true);
    }
  }

  function stopEditing() {
    setEditing(false);
    op.stop();
  }

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      await save.mutateAsync(draft.trim());
      stopEditing();
    } catch {
      // Shown via save.error; the draft is kept.
    }
  }

  if (editing) {
    return (
      <form className="description-form" onSubmit={handleSubmit}>
        <label htmlFor={fieldId} className="visually-hidden">
          Board description
        </label>
        <textarea
          id={fieldId}
          value={draft}
          maxLength={MAX_LENGTH}
          rows={5}
          autoFocus
          placeholder="What is this board tracking?"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.stopPropagation();
              stopEditing();
            }
          }}
        />
        <ErrorMessage error={save.error} />
        <div className="inline-actions">
          <button
            type="submit"
            className="button primary"
            disabled={save.isPending}
          >
            Save
          </button>
          <button type="button" className="button" onClick={stopEditing}>
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="board-description">
      {board.description && <p>{board.description}</p>}
      <button
        type="button"
        className="link-button"
        disabled={op.locked}
        title={op.locked ? OPERATION_HINT : undefined}
        onClick={startEditing}
      >
        {board.description ? 'Edit description' : 'Add description'}
      </button>
    </div>
  );
}
