/**
 * @fileoverview One stage (column): header actions, its tasks and an
 * add-task form.
 */

import {useState} from 'react';
import * as api from '../../api/boards.js';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import InlineEditForm from '../../components/InlineEditForm.jsx';
import {useBoardMutation} from '../boards/boardQueries.js';
import {pluralize} from '../boards/boardModel.js';
import AddTaskForm from '../tasks/AddTaskForm.jsx';
import TaskCard from '../tasks/TaskCard.jsx';
import TaskDialog from '../tasks/TaskDialog.jsx';

/**
 * @param {{
 *   boardId: number,
 *   stage: !Object,
 *   tasks: !Array<!Object>,
 *   canMoveLeft: boolean,
 *   canMoveRight: boolean,
 *   onMove: function(number),
 *   onDeleteError: function(!Error),
 * }} props
 */
export default function Stage({
  boardId,
  stage,
  tasks,
  canMoveLeft,
  canMoveRight,
  onMove,
  onDeleteError,
}) {
  const [renaming, setRenaming] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [openTaskId, setOpenTaskId] = useState(null);
  const rename = useBoardMutation((name) => api.updateStage(stage.id, {name}));
  const remove = useBoardMutation(() => api.deleteStage(stage.id));
  const openTask = tasks.find((task) => task.id === openTaskId);

  async function handleDelete() {
    setConfirmingDelete(false);
    try {
      await remove.mutateAsync();
    } catch (err) {
      onDeleteError(err);
    }
  }

  return (
    <section className="stage" aria-label={stage.name}>
      <header className="stage-header">
        {renaming ? (
          <InlineEditForm
            label="Stage name"
            initialValue={stage.name}
            maxLength={50}
            onSave={async (name) => {
              await rename.mutateAsync(name);
              setRenaming(false);
            }}
            onCancel={() => setRenaming(false)}
          />
        ) : (
          <>
            <h2 className="stage-title">
              {stage.name} <span className="count">{tasks.length}</span>
            </h2>
            <div className="stage-actions">
              <button
                type="button"
                className="icon-button"
                aria-label={`Move ${stage.name} left`}
                disabled={!canMoveLeft}
                onClick={() => onMove(-1)}
              >
                ←
              </button>
              <button
                type="button"
                className="icon-button"
                aria-label={`Move ${stage.name} right`}
                disabled={!canMoveRight}
                onClick={() => onMove(1)}
              >
                →
              </button>
              <button
                type="button"
                className="icon-button"
                aria-label={`Rename stage ${stage.name}`}
                onClick={() => setRenaming(true)}
              >
                ✎
              </button>
              <button
                type="button"
                className="icon-button"
                aria-label={`Delete stage ${stage.name}`}
                onClick={() => setConfirmingDelete(true)}
              >
                🗑
              </button>
            </div>
          </>
        )}
      </header>
      <ol className="task-list">
        {tasks.map((task) => (
          <li key={task.id}>
            <TaskCard task={task} onOpen={() => setOpenTaskId(task.id)} />
          </li>
        ))}
      </ol>
      <AddTaskForm boardId={boardId} stage={stage} />
      {openTask && (
        <TaskDialog task={openTask} onClose={() => setOpenTaskId(null)} />
      )}
      {confirmingDelete && (
        <ConfirmDialog
          title="Delete stage?"
          onConfirm={handleDelete}
          onCancel={() => setConfirmingDelete(false)}
        >
          <p>
            <strong>{stage.name}</strong>
            {tasks.length > 0
              ? ` and its ${pluralize(tasks.length, 'task')} will be deleted.`
              : ' will be deleted.'}{' '}
            This cannot be undone.
          </p>
        </ConfirmDialog>
      )}
    </section>
  );
}
