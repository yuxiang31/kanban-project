/**
 * @fileoverview A single board: header actions and its stages.
 */

import {useState} from 'react';
import {Link, useNavigate, useParams} from 'react-router';
import {useQueryClient} from '@tanstack/react-query';
import * as api from '../../api/boards.js';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import ErrorMessage from '../../components/ErrorMessage.jsx';
import InlineEditForm from '../../components/InlineEditForm.jsx';
import AddStageForm from '../stages/AddStageForm.jsx';
import Stage from '../stages/Stage.jsx';
import {boardKey, useBoard, useBoardMutation} from './boardQueries.js';
import {neighboursForStep, tasksByStage} from './boardModel.js';

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
  const moveStage = useBoardMutation(({stageId, ...neighbours}) =>
    api.updateStage(stageId, neighbours),
  );

  async function handleDelete() {
    await api.deleteBoard(board.id);
    queryClient.removeQueries({queryKey: boardKey(board.id)});
    await queryClient.invalidateQueries({queryKey: ['boards'], exact: true});
    navigate('/', {replace: true});
  }

  /** Runs a board action, surfacing failures in the board-level alert. */
  async function runAction(action) {
    setActionError(null);
    try {
      await action();
    } catch (err) {
      setActionError(err);
    }
  }

  const groups = tasksByStage(board.tasks);

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
      <div className="stages">
        {board.stages.map((stage, index) => (
          <Stage
            key={stage.id}
            boardId={board.id}
            stage={stage}
            tasks={groups.get(stage.id) ?? []}
            canMoveLeft={index > 0}
            canMoveRight={index < board.stages.length - 1}
            onMove={(direction) =>
              runAction(() =>
                moveStage.mutateAsync({
                  stageId: stage.id,
                  ...neighboursForStep(board.stages, index, direction),
                }),
              )
            }
            onDeleteError={setActionError}
          />
        ))}
        <AddStageForm boardId={board.id} />
      </div>
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
