import {useState} from 'react';
import * as api from '../../api/boards.js';
import InlineEditForm from '../../components/InlineEditForm.jsx';
import {useBoardMutation} from '../boards/boardQueries.js';

/** @param {{boardId: number}} props */
export default function AddStageForm({boardId}) {
  const [open, setOpen] = useState(false);
  const create = useBoardMutation((name) => api.createStage(boardId, {name}));

  if (!open) {
    return (
      <button
        type="button"
        className="add-stage-button"
        onClick={() => setOpen(true)}
      >
        + Add stage
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
          setOpen(false);
        }}
        onCancel={() => setOpen(false)}
      />
    </div>
  );
}
