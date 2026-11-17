/**
 * @fileoverview A single board: header actions and its stages, with drag
 * and drop (pointer or keyboard) for tasks and stages.
 */

import {useMemo, useState} from 'react';
import {Link, useNavigate, useParams} from 'react-router';
import {useQueryClient} from '@tanstack/react-query';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import * as api from '../../api/boards.js';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import ErrorMessage from '../../components/ErrorMessage.jsx';
import InlineEditForm from '../../components/InlineEditForm.jsx';
import AddStageForm from '../stages/AddStageForm.jsx';
import Stage from '../stages/Stage.jsx';
import {boardKey, useBoard, useBoardMutation} from './boardQueries.js';
import {neighboursForStep} from './boardModel.js';
import {
  keyboardCoordinates,
  makeAnnouncements,
  makeCollisionDetection,
  parseDndId,
  stageDndId,
} from './dnd.js';
import {useBoardDnd} from './useBoardDnd.js';
import {useMoveStage, useMoveTask} from './useMoves.js';

/**
 * Re-measure drop targets throughout a drag: moving a task into another
 * stage changes the layout, and stale rects make items jump.
 */
const MEASURING = {droppable: {strategy: MeasuringStrategy.Always}};

const DRAG_INSTRUCTIONS =
  'Press Space to pick up a task or stage. While dragging, use the arrow ' +
  'keys to move it, Space to drop it, or Escape to cancel. Press Enter to ' +
  'open a task.';

export default function BoardPage() {
  const boardId = Number(useParams().boardId);
  const board = useBoard(boardId);

  if (board.isPending) {
    return (
      <p role="status" className="page">
        Loading board…
      </p>
    );
  }
  if (board.error) {
    return (
      <main className="page">
        <ErrorMessage error={board.error} />
        <Link to="/">Back to boards</Link>
      </main>
    );
  }
  return <BoardView board={board.data} />;
}

/** @param {{board: !Object}} props */
function BoardView({board}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [renaming, setRenaming] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [actionError, setActionError] = useState(null);

  const rename = useBoardMutation((name) => api.renameBoard(board.id, {name}));
  const moveTask = useMoveTask(board.id);
  const moveStage = useMoveStage(board.id);

  /** Starts an optimistic move; failures show in the board-level alert. */
  const runMove = (mutation) => (move) => {
    setActionError(null);
    mutation.mutate(move, {onError: setActionError});
  };

  const {groups, stages, activeId, handlers} = useBoardDnd({
    board,
    onMoveTask: runMove(moveTask),
    onMoveStage: runMove(moveStage),
  });
  const sensors = useSensors(
    // A small distance keeps plain clicks working as "open".
    useSensor(PointerSensor, {activationConstraint: {distance: 5}}),
    useSensor(KeyboardSensor, {
      coordinateGetter: keyboardCoordinates,
      keyboardCodes: {
        start: ['Space'],
        cancel: ['Escape'],
        end: ['Space', 'Enter'],
      },
    }),
  );

  async function handleDelete() {
    await api.deleteBoard(board.id);
    queryClient.removeQueries({queryKey: boardKey(board.id)});
    await queryClient.invalidateQueries({queryKey: ['boards'], exact: true});
    navigate('/', {replace: true});
  }

  const collisionDetection = useMemo(
    () => makeCollisionDetection(groups),
    [groups],
  );
  const taskById = new Map(board.tasks.map((task) => [task.id, task]));
  const tasksOf = (stageId) =>
    (groups[stageId] ?? []).map((id) => taskById.get(id));
  const active = parseDndId(activeId);

  return (
    <main className="board-page">
      <div className="board-header">
        {renaming ? (
          <InlineEditForm
            label="Board name"
            initialValue={board.name}
            maxLength={100}
            onSave={async (name) => {
              await rename.mutateAsync(name);
              setRenaming(false);
            }}
            onCancel={() => setRenaming(false)}
          />
        ) : (
          <h1>{board.name}</h1>
        )}
        <div className="board-actions">
          {!renaming && (
            <button
              type="button"
              className="button"
              onClick={() => setRenaming(true)}
            >
              Rename board
            </button>
          )}
          {board.canDelete && (
            <button
              type="button"
              className="button danger-outline"
              onClick={() => setConfirmingDelete(true)}
            >
              Delete board
            </button>
          )}
        </div>
      </div>
      <ErrorMessage error={actionError} />
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        measuring={MEASURING}
        accessibility={{
          announcements: makeAnnouncements(board),
          screenReaderInstructions: {draggable: DRAG_INSTRUCTIONS},
        }}
        {...handlers}
      >
        <div className="stages">
          <SortableContext
            items={stages.map((stage) => stageDndId(stage.id))}
            strategy={horizontalListSortingStrategy}
          >
            {stages.map((stage, index) => (
              <Stage
                key={stage.id}
                boardId={board.id}
                stage={stage}
                tasks={tasksOf(stage.id)}
                canMoveLeft={index > 0}
                canMoveRight={index < stages.length - 1}
                onMove={(direction) =>
                  runMove(moveStage)({
                    stageId: stage.id,
                    ...neighboursForStep(stages, index, direction),
                  })
                }
                onDeleteError={setActionError}
              />
            ))}
          </SortableContext>
          <AddStageForm boardId={board.id} />
        </div>
        <DragOverlay>
          {active?.type === 'task' && (
            <div className="task-card is-overlay">
              {taskById.get(active.id)?.title}
            </div>
          )}
          {active?.type === 'stage' && (
            <StagePreview
              stage={stages.find((s) => s.id === active.id)}
              tasks={tasksOf(active.id)}
            />
          )}
        </DragOverlay>
      </DndContext>
      {confirmingDelete && (
        <ConfirmDialog
          title="Delete board?"
          onConfirm={handleDelete}
          onCancel={() => setConfirmingDelete(false)}
        >
          <p>
            <strong>{board.name}</strong> and all of its stages and tasks will
            be deleted for everyone. This cannot be undone.
          </p>
        </ConfirmDialog>
      )}
    </main>
  );
}

/**
 * What follows the pointer while a stage is dragged: a full-size copy of
 * the column, so it does not shrink to a header on pick-up.
 * @param {{stage: !Object, tasks: !Array<!Object>}} props
 */
function StagePreview({stage, tasks}) {
  return (
    <div className="stage is-overlay" aria-hidden="true">
      <div className="stage-header">
        <h2 className="stage-title">
          {stage.name} <span className="count">{tasks.length}</span>
        </h2>
      </div>
      <ol className="task-list">
        {tasks.map((task) => (
          <li key={task.id}>
            <div className="task-card">{task.title}</div>
          </li>
        ))}
      </ol>
    </div>
  );
}
