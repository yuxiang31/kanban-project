/**
 * @fileoverview One stage (column): a header with its actions, its
 * sortable tasks and an add-task form. The section is itself a drop target
 * so tasks can be dropped into an empty stage. While any change is open on
 * the board, the stage's own controls wait (see boardOperation.js).
 */

import {useState} from 'react';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import * as api from '../../api/boards.js';
import ColorDialog from '../../components/ColorDialog.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  GripIcon,
  PaletteIcon,
  PencilIcon,
  TrashIcon,
} from '../../components/Icons.jsx';
import InlineEditForm from '../../components/InlineEditForm.jsx';
import {useBoardMutation} from '../boards/boardQueries.js';
import {pluralize} from '../boards/boardModel.js';
import {OPERATION_HINT, useBoardOperation} from '../boards/boardOperation.js';
import {stageDndId, taskDndId} from '../boards/dnd.js';
import AddTaskForm from '../tasks/AddTaskForm.jsx';
import TaskCard from '../tasks/TaskCard.jsx';
import TaskDialog from '../tasks/TaskDialog.jsx';

/**
 * @param {{
 *   boardId: number,
 *   stage: !Object,
 *   members: !Array<!Object>,
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
  members,
  tasks,
  canMoveLeft,
  canMoveRight,
  onMove,
  onDeleteError,
}) {
  const [renaming, setRenaming] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [choosingColor, setChoosingColor] = useState(false);
  const [openTaskId, setOpenTaskId] = useState(null);
  // A task just added here: shown until the board refetch includes it (or
  // for good, if the person filter hides it).
  const [addedTask, setAddedTask] = useState(null);
  const renameOp = useBoardOperation(`rename-stage:${stage.id}`);
  const {locked} = renameOp;
  const rename = useBoardMutation((name) => api.updateStage(stage.id, {name}));
  const recolor = useBoardMutation((color) =>
    api.updateStage(stage.id, {color}),
  );
  const remove = useBoardMutation(() => api.deleteStage(stage.id));
  const openTask =
    tasks.find((task) => task.id === openTaskId) ??
    (addedTask?.id === openTaskId ? addedTask : undefined);
  const memberById = new Map(members.map((m) => [m.id, m]));
  /** Assignees still on the board, in the board's member order. */
  const membersFor = (task) =>
    task.assigneeIds.map((id) => memberById.get(id)).filter(Boolean);
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: stageDndId(stage.id),
    data: {type: 'stage'},
    disabled: locked,
  });
  /** Explains a paused control on hover. */
  const pausedTitle = locked ? OPERATION_HINT : undefined;

  function startRename() {
    if (renameOp.start()) {
      setRenaming(true);
    }
  }

  function stopRename() {
    setRenaming(false);
    renameOp.stop();
  }

  async function handleDelete() {
    setConfirmingDelete(false);
    try {
      await remove.mutateAsync();
    } catch (err) {
      onDeleteError(err);
    }
  }

  return (
    <section
      ref={setNodeRef}
      style={{transform: CSS.Translate.toString(transform), transition}}
      className={`stage${isDragging ? ' is-dragging' : ''}`}
      data-color={stage.color ?? undefined}
      aria-label={stage.name}
    >
      <header className="stage-header">
        {renaming ? (
          <InlineEditForm
            label="Stage name"
            initialValue={stage.name}
            maxLength={50}
            onSave={async (name) => {
              await rename.mutateAsync(name);
              stopRename();
            }}
            onCancel={stopRename}
          />
        ) : (
          <>
            <h2 className="stage-title">
              {stage.name} <span className="count">{tasks.length}</span>
            </h2>
            <div className="stage-actions" title={pausedTitle}>
              <button
                ref={setActivatorNodeRef}
                type="button"
                className="icon-button drag-handle"
                {...attributes}
                {...listeners}
                disabled={locked}
                aria-label={`Drag stage ${stage.name}`}
              >
                <GripIcon />
              </button>
              <button
                type="button"
                className="icon-button"
                aria-label={`Move ${stage.name} left`}
                disabled={locked || !canMoveLeft}
                onClick={() => onMove(-1)}
              >
                <ArrowLeftIcon />
              </button>
              <button
                type="button"
                className="icon-button"
                aria-label={`Move ${stage.name} right`}
                disabled={locked || !canMoveRight}
                onClick={() => onMove(1)}
              >
                <ArrowRightIcon />
              </button>
              <button
                type="button"
                className="icon-button"
                aria-label={`Colour for stage ${stage.name}`}
                disabled={locked}
                onClick={() => setChoosingColor(true)}
              >
                <PaletteIcon />
              </button>
              <button
                type="button"
                className="icon-button"
                aria-label={`Rename stage ${stage.name}`}
                disabled={locked}
                onClick={startRename}
              >
                <PencilIcon />
              </button>
              <button
                type="button"
                className="icon-button"
                aria-label={`Delete stage ${stage.name}`}
                disabled={locked}
                onClick={() => setConfirmingDelete(true)}
              >
                <TrashIcon />
              </button>
            </div>
          </>
        )}
      </header>
      <SortableContext
        items={tasks.map((task) => taskDndId(task.id))}
        strategy={verticalListSortingStrategy}
      >
        <ol className="task-list">
          {tasks.map((task) => (
            <li key={task.id}>
              <TaskCard
                task={task}
                assignees={membersFor(task)}
                onOpen={() => {
                  setAddedTask(null);
                  setOpenTaskId(task.id);
                }}
              />
            </li>
          ))}
        </ol>
        {tasks.length === 0 && <p className="stage-empty">No tasks yet</p>}
      </SortableContext>
      <AddTaskForm
        boardId={boardId}
        stage={stage}
        onCreated={(task) => {
          setAddedTask(task);
          setOpenTaskId(task.id);
        }}
      />
      {openTask && (
        <TaskDialog
          key={openTask.id}
          task={openTask}
          members={members}
          addedTo={addedTask?.id === openTask.id ? stage.name : undefined}
          onClose={() => {
            setOpenTaskId(null);
            setAddedTask(null);
          }}
        />
      )}
      {choosingColor && (
        <ColorDialog
          title={`Colour for ${stage.name}`}
          initial={stage.color}
          note="Shown as an outline around the stage."
          onSave={(color) => recolor.mutateAsync(color)}
          onClose={() => setChoosingColor(false)}
        />
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
