/**
 * @fileoverview Edit a task's title, description and assignees, or
 * delete it.
 */

import {useId, useState} from 'react';
import * as api from '../../api/boards.js';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import ErrorMessage from '../../components/ErrorMessage.jsx';
import {Avatar} from '../../components/Avatar.jsx';
import ColorPicker from '../../components/ColorPicker.jsx';
import Modal from '../../components/Modal.jsx';
import {useBoardMutation} from '../boards/boardQueries.js';

/**
 * @param {{task: !Object, members: !Array<!Object>, onClose: function()}}
 *     props `members` are the people who can be assigned on this board.
 */
export default function TaskDialog({task, members, onClose}) {
  const assigneesId = useId();
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [color, setColor] = useState(task.color ?? null);
  const [assigneeIds, setAssigneeIds] = useState(
    () => new Set(task.assigneeIds),
  );
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const save = useBoardMutation(async ({assignees, ...fields}) => {
    await api.updateTask(task.id, fields);
    const changed =
      assignees.length !== task.assigneeIds.length ||
      assignees.some((id) => !task.assigneeIds.includes(id));
    if (changed) {
      await api.setAssignees(task.id, assignees);
    }
  });

  function toggleAssignee(userId) {
    setAssigneeIds((current) => {
      const next = new Set(current);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  }
  const remove = useBoardMutation(() => api.deleteTask(task.id));

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      await save.mutateAsync({
        title: title.trim(),
        description,
        color,
        assignees: [...assigneeIds].sort((a, b) => a - b),
      });
      onClose();
    } catch {
      // Shown via save.error.
    }
  }

  if (confirmingDelete) {
    return (
      <ConfirmDialog
        title="Delete task?"
        onConfirm={async () => {
          await remove.mutateAsync();
          onClose();
        }}
        onCancel={() => setConfirmingDelete(false)}
      >
        <p>
          <strong>{task.title}</strong> will be deleted. This cannot be undone.
        </p>
      </ConfirmDialog>
    );
  }

  return (
    <Modal title="Edit task" onClose={onClose}>
      <form className="form" onSubmit={handleSubmit}>
        <label>
          Title
          {/* A growing textarea so long titles wrap and stay fully visible;
              Enter still saves, since a title never needs a line break. */}
          <textarea
            className="title-field"
            value={title}
            maxLength={200}
            rows={1}
            required
            onChange={(event) =>
              setTitle(event.target.value.replace(/\n/g, ' '))
            }
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form.requestSubmit();
              }
            }}
          />
        </label>
        <label>
          Description
          <textarea
            value={description}
            maxLength={5000}
            rows={6}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
        <ColorPicker value={color} onChange={setColor} />
        <fieldset className="assignees" aria-labelledby={assigneesId}>
          <legend id={assigneesId}>Assigned to</legend>
          {members.map((member) => (
            <label key={member.id} className="assignee-option">
              <input
                type="checkbox"
                checked={assigneeIds.has(member.id)}
                onChange={() => toggleAssignee(member.id)}
              />
              <Avatar user={member} />
              <span>{member.displayName}</span>
            </label>
          ))}
        </fieldset>
        <ErrorMessage error={save.error} />
        <div className="dialog-actions split">
          <button
            type="button"
            className="button danger-outline"
            onClick={() => setConfirmingDelete(true)}
          >
            Delete task
          </button>
          <span>
            <button type="button" className="button" onClick={onClose}>
              Cancel
            </button>{' '}
            <button
              type="submit"
              className="button primary"
              disabled={!title.trim() || save.isPending}
            >
              Save
            </button>
          </span>
        </div>
      </form>
    </Modal>
  );
}
