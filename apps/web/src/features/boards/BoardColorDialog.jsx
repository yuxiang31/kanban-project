import {useState} from 'react';
import * as api from '../../api/boards.js';
import ColorPicker from '../../components/ColorPicker.jsx';
import ErrorMessage from '../../components/ErrorMessage.jsx';
import Modal from '../../components/Modal.jsx';
import {useBoardMutation} from './boardQueries.js';

/** @param {{board: !Object, onClose: function()}} props */
export default function BoardColorDialog({board, onClose}) {
  const [color, setColor] = useState(board.color ?? null);
  const save = useBoardMutation(() => api.updateBoard(board.id, {color}));

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      await save.mutateAsync();
      onClose();
    } catch {
      // Shown via save.error.
    }
  }

  return (
    <Modal title="Board colour" onClose={onClose}>
      <form className="form" onSubmit={handleSubmit}>
        <ColorPicker value={color} onChange={setColor} />
        <p className="muted small">
          Shown on the board’s card in your list and next to its name here.
          Everyone with access sees it.
        </p>
        <ErrorMessage error={save.error} />
        <div className="dialog-actions">
          <button type="button" className="button" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className="button primary"
            disabled={save.isPending}
          >
            Save
          </button>
        </div>
      </form>
    </Modal>
  );
}
