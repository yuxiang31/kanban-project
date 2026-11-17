/**
 * @fileoverview A single board: header actions and its stages, with drag
 * and drop (pointer or keyboard) for tasks and stages.
 */

import {useMemo, useRef, useState} from 'react';
import {Link, useNavigate, useParams, useSearchParams} from 'react-router';
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
import Skeleton from '../../components/Skeleton.jsx';
import InlineEditForm from '../../components/InlineEditForm.jsx';
import BoardColorDialog from './BoardColorDialog.jsx';
import BoardDescription from './BoardDescription.jsx';
import {BoardOperationContext, OPERATION_HINT} from './boardOperation.js';
import {useBoardSocket} from '../../hooks/useBoardSocket.js';
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
import PeopleFilter from './PeopleFilter.jsx';
import {
  PEOPLE_PARAM,
  filterTasks,
  parsePeopleFilter,
  serializePeopleFilter,
} from './peopleFilter.js';

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
      <main className="board-page">
        <Skeleton label="Loading board…" variant="stages" />
      </main>
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
  const [choosingColor, setChoosingColor] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [actionError, setActionError] = useState(null);

  // One change at a time (boardOperation.js). A ref keeps begin/end
  // correct when two clicks land before React re-renders.
  const [activeOp, setActiveOp] = useState(null);
  const activeOpRef = useRef(null);
  const operation = useMemo(
    () => ({
      active: activeOp,
      begin(key) {
        if (activeOpRef.current !== null && activeOpRef.current !== key) {
          return false;
        }
        activeOpRef.current = key;
        setActiveOp(key);
        return true;
      },
      end(key) {
        if (activeOpRef.current === key) {
          activeOpRef.current = null;
          setActiveOp(null);
        }
      },
    }),
    [activeOp],
  );
  const locked = activeOp !== null;
  const pausedTitle = locked ? OPERATION_HINT : undefined;

  function startRenaming() {
    if (operation.begin('rename-board')) {
      setRenaming(true);
    }
  }

  function stopRenaming() {
    setRenaming(false);
    operation.end('rename-board');
  }

  const rename = useBoardMutation((name) => api.renameBoard(board.id, {name}));

  /** Leaves a board that is gone, explaining why on the board list. */
  function leaveBoard(notice) {
    queryClient.removeQueries({queryKey: boardKey(board.id)});
    queryClient.invalidateQueries({queryKey: ['boards'], exact: true});
    navigate('/', {replace: true, state: {notice}});
  }
  const liveStatus = useBoardSocket(board.id, {
    onBoardDeleted: (actorName) =>
      leaveBoard(
        actorName
          ? `“${board.name}” was deleted by ${actorName}.`
          : `“${board.name}” was deleted.`,
      ),
    onAccessLost: () =>
      leaveBoard(`You no longer have access to “${board.name}”.`),
  });
  const moveTask = useMoveTask(board.id);
  const moveStage = useMoveStage(board.id);

  /** Starts an optimistic move; failures show in the board-level alert. */
  const runMove = (mutation) => (move) => {
    setActionError(null);
    mutation.mutate(move, {onError: setActionError});
  };

  // The person filter lives in the URL; the filtered board is memoized so
  // its identity only changes with the data or the filter (the drag hook
  // relies on that to keep a dropped order on screen).
  const [searchParams, setSearchParams] = useSearchParams();
  const filterValue = searchParams.get(PEOPLE_PARAM) ?? '';
  const selectedPeople = useMemo(
    () => parsePeopleFilter(filterValue),
    [filterValue],
  );
  const visibleBoard = useMemo(
    () =>
      selectedPeople.size === 0
        ? board
        : {...board, tasks: filterTasks(board.tasks, selectedPeople)},
    [board, selectedPeople],
  );
  function setPeopleFilter(selected) {
    setSearchParams(
      (params) => {
        const value = serializePeopleFilter(selected);
        if (value) {
          params.set(PEOPLE_PARAM, value);
        } else {
          params.delete(PEOPLE_PARAM);
        }
        return params;
      },
      {replace: true},
    );
  }

  const {groups, stages, activeId, handlers} = useBoardDnd({
    board: visibleBoard,
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
    navigate('/', {
      replace: true,
      state: {notice: `“${board.name}” was deleted.`},
    });
  }

  const collisionDetection = useMemo(
    () => makeCollisionDetection(groups),
    [groups],
  );
  const taskById = new Map(visibleBoard.tasks.map((task) => [task.id, task]));
  const tasksOf = (stageId) =>
    (groups[stageId] ?? []).map((id) => taskById.get(id));
  const active = parseDndId(activeId);

  return (
    <BoardOperationContext.Provider value={operation}>
      <main className="board-page">
        <div className="board-header">
          {renaming ? (
            <InlineEditForm
              label="Board name"
              initialValue={board.name}
              maxLength={100}
              onSave={async (name) => {
                await rename.mutateAsync(name);
                stopRenaming();
              }}
              onCancel={stopRenaming}
            />
          ) : (
            <div className="board-heading">
              <h1>
                {board.color && (
                  <span
                    className="board-color-dot"
                    data-color={board.color}
                    aria-hidden="true"
                  />
                )}
                {board.name}
              </h1>
              {board.team && (
                <p className="muted small board-team">
                  Shared with{' '}
                  <Link to={`/teams/${board.team.id}`}>{board.team.name}</Link>
                </p>
              )}
              <BoardDescription board={board} />
            </div>
          )}
          <div className="board-actions">
            <span
              className={`live-status is-${liveStatus}`}
              title="Changes by others appear automatically"
            >
              {liveStatus === 'live'
                ? 'Live'
                : liveStatus === 'reconnecting'
                  ? 'Reconnecting…'
                  : 'Connecting…'}
            </span>
            <button
              type="button"
              className="button"
              aria-label="Board colour"
              disabled={locked}
              title={pausedTitle}
              onClick={() => setChoosingColor(true)}
            >
              {board.color && (
                <span
                  className="swatch-dot"
                  data-color={board.color}
                  aria-hidden="true"
                />
              )}
              Colour
            </button>
            {!renaming && (
              <button
                type="button"
                className="button"
                disabled={locked}
                title={pausedTitle}
                onClick={startRenaming}
              >
                Rename board
              </button>
            )}
            {board.canDelete && (
              <button
                type="button"
                className="button danger-outline"
                disabled={locked}
                title={pausedTitle}
                onClick={() => setConfirmingDelete(true)}
              >
                Delete board
              </button>
            )}
          </div>
        </div>
        <PeopleFilter
          members={board.members}
          selected={selectedPeople}
          onChange={setPeopleFilter}
          visibleCount={visibleBoard.tasks.length}
          totalCount={board.tasks.length}
        />
        <ErrorMessage error={actionError} />
        {locked && (
          <p className="operation-hint" role="status">
            {OPERATION_HINT}
          </p>
        )}
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetection}
          measuring={MEASURING}
          accessibility={{
            announcements: makeAnnouncements(visibleBoard),
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
                  members={board.members}
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
        {choosingColor && (
          <BoardColorDialog
            board={board}
            onClose={() => setChoosingColor(false)}
          />
        )}
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
    </BoardOperationContext.Provider>
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
