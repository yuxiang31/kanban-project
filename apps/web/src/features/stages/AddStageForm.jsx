import {useState} from 'react';
import * as api from '../../api/boards.js';
import {PlusIcon} from '../../components/Icons.jsx';
import InlineEditForm from '../../components/InlineEditForm.jsx';
import {useBoardMutation} from '../boards/boardQueries.js';
import {OPERATION_HINT, useBoardOperation} from '../boards/boardOperation.js';

/** @param {{boardId: number}} props */
export default function AddStageForm({boardId}) {
  const op = useBoardOperation('add-stage');
  const [open, setOpen] = useState(false);

  function close() {
    setOpen(false);
    op.stop();
  }
  const create = useBoardMutation((name) => api.createStage(boardId, {name}));

  if (!open) {
    return (
      <button
        type="button"
        className="add-stage-button"
        disabled={op.locked}
        title={op.locked ? OPERATION_HINT : undefined}
        onClick={() => op.start() && setOpen(true)}
      >
        <PlusIcon />
        Add stage
      </button>
    );
  }
  return (
    <div className="stage add-stage">
      <InlineEditForm
        label="New stage name"
        maxLength={50}
        submitLabel="Add"
        onSave={async (name) => {
          await create.mutateAsync(name);
          close();
        }}
        onCancel={close}
      />
    </div>
  );
}
