/**
 * @fileoverview A task's optional to-do list, as a drop-down at the bottom
 * of its card on the board. Every change saves straight away and is pushed
 * live. It sits outside the card's open/drag area, so using it never opens
 * or drags the task.
 */

import {useId, useRef, useState} from 'react';
import * as api from '../../api/boards.js';
import ErrorMessage from '../../components/ErrorMessage.jsx';
import {
  ChecklistIcon,
  ChevronIcon,
  PencilIcon,
  TrashIcon,
} from '../../components/Icons.jsx';
import {OPERATION_HINT} from '../boards/boardOperation.js';
import {useBoardMutation} from '../boards/boardQueries.js';

const MAX_TEXT = 300;

/**
 * @param {{task: !Object, disabled?: boolean}} props `disabled` while
 *     another change is open on the board: the list can still be folded
 *     and unfolded, but not changed.
 */
export default function Checklist({task, disabled = false}) {
  const panelId = useId();
  const addRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');

  // The task prop refreshes after every change (and on live updates), but
  // the reply to our own change arrives first; show it until then. Once
  // the prop changes, it wins again.
  const [reply, setReply] = useState(null);
  const items =
    reply && reply.source === task.checklist
      ? reply.items
      : (task.checklist ?? []);
  const keepItems = (next) => setReply({source: task.checklist, items: next});
  const done = items.filter((item) => item.done).length;

  const add = useBoardMutation((text) => api.addChecklistItem(task.id, text));
  const update = useBoardMutation(({id, ...fields}) =>
    api.updateChecklistItem(id, fields),
  );
  const remove = useBoardMutation((id) => api.deleteChecklistItem(id));
  const error = add.error ?? update.error ?? remove.error;
  const pausedTitle = disabled ? OPERATION_HINT : undefined;

  function resetErrors() {
    add.reset();
    update.reset();
    remove.reset();
  }

  async function addItem() {
    const text = draft.trim();
    if (!text || disabled) {
      return;
    }
    resetErrors();
    try {
      keepItems((await add.mutateAsync(text)).task.checklist);
      setDraft('');
      addRef.current?.focus();
    } catch {
      // Shown via add.error; the text is kept.
    }
  }

  async function changeItem(id, fields) {
    resetErrors();
    try {
      keepItems((await update.mutateAsync({id, ...fields})).task.checklist);
      return true;
    } catch {
      return false;
    }
  }

  async function saveEdit(item) {
    const text = editText.trim();
    if (!text || text === item.text || (await changeItem(item.id, {text}))) {
      setEditingId(null);
    }
  }

  async function deleteItem(item) {
    resetErrors();
    try {
      await remove.mutateAsync(item.id);
      keepItems(items.filter((i) => i.id !== item.id));
    } catch {
      // Shown via remove.error.
    }
  }

  const toggleLabel =
    items.length > 0
      ? `Checklist for ${task.title}, ${done} of ${items.length} done`
      : `Checklist for ${task.title}`;

  return (
    <div
      className="card-checklist"
      data-empty={items.length === 0 || undefined}
    >
      <button
        type="button"
        className="checklist-toggle"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={toggleLabel}
        onClick={() => setOpen((value) => !value)}
      >
        <ChevronIcon />
        <ChecklistIcon />
        {items.length > 0 ? (
          <span
            className="checklist-count"
            data-complete={done === items.length || undefined}
          >
            {done}/{items.length}
          </span>
        ) : (
          <span>Checklist</span>
        )}
        {items.length > 0 && (
          <span className="checklist-bar" aria-hidden="true">
            <span style={{width: `${(100 * done) / items.length}%`}} />
          </span>
        )}
      </button>
      {open && (
        <div id={panelId} className="checklist-panel">
          {items.length > 0 && (
            <ul
              className="checklist-items"
              aria-label={`Checklist for ${task.title}`}
            >
              {items.map((item) => (
                <li key={item.id} className={item.done ? 'is-done' : undefined}>
                  {editingId === item.id ? (
                    <input
                      className="checklist-edit"
                      aria-label="Edit to-do"
                      value={editText}
                      maxLength={MAX_TEXT}
                      autoFocus
                      onChange={(event) => setEditText(event.target.value)}
                      onBlur={() => saveEdit(item)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          saveEdit(item);
                        } else if (event.key === 'Escape') {
                          event.stopPropagation();
                          setEditingId(null);
                        }
                      }}
                    />
                  ) : (
                    <>
                      <label className="checklist-item">
                        <input
                          type="checkbox"
                          checked={item.done}
                          disabled={disabled}
                          title={pausedTitle}
                          onChange={() =>
                            changeItem(item.id, {done: !item.done})
                          }
                        />
                        <span>{item.text}</span>
                      </label>
                      <button
                        type="button"
                        className="icon-button"
                        aria-label={`Edit to-do ${item.text}`}
                        disabled={disabled}
                        title={pausedTitle}
                        onClick={() => {
                          setEditText(item.text);
                          setEditingId(item.id);
                        }}
                      >
                        <PencilIcon />
                      </button>
                      <button
                        type="button"
                        className="icon-button"
                        aria-label={`Delete to-do ${item.text}`}
                        disabled={disabled}
                        title={pausedTitle}
                        onClick={() => deleteItem(item)}
                      >
                        <TrashIcon />
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
          <div className="checklist-add">
            <input
              ref={addRef}
              aria-label={`Add a to-do to ${task.title}`}
              value={draft}
              maxLength={MAX_TEXT}
              placeholder="Add a to-do"
              disabled={disabled}
              title={pausedTitle}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  addItem();
                }
              }}
            />
            <button
              type="button"
              className="button"
              disabled={disabled || !draft.trim() || add.isPending}
              onClick={addItem}
            >
              Add
            </button>
          </div>
          <ErrorMessage error={error} />
        </div>
      )}
    </div>
  );
}
