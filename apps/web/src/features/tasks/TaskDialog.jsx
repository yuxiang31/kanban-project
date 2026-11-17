/**
 * @fileoverview Edit a task's title and description, or delete it.
 */

import {useState} from 'react';
import * as api from '../../api/boards.js';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import ErrorMessage from '../../components/ErrorMessage.jsx';
import Modal from '../../components/Modal.jsx';
import {useBoardMutation} from '../boards/boardQueries.js';

/** @param {{task: !Object, onClose: function()}} props */
export default function TaskDialog({task, onClose}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const save = useBoardMutation((input) => api.updateTask(task.id, input));
  const remove = useBoardMutation(() => api.deleteTask(task.id));

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      await save.mutateAsync({title: title.trim(), description});
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
          <input
            value={title}
            maxLength={200}
            required
            onChange={(event) => setTitle(event.target.value)}
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
