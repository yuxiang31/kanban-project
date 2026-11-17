import * as api from '../../api/boards.js';
import ColorDialog from '../../components/ColorDialog.jsx';
import {useBoardMutation} from './boardQueries.js';

/** @param {{board: !Object, onClose: function()}} props */
export default function BoardColorDialog({board, onClose}) {
  const save = useBoardMutation((color) => api.updateBoard(board.id, {color}));
  return (
    <ColorDialog
      title="Board colour"
      initial={board.color}
      note="Shown on the board’s card in your list and next to its name here. Everyone with access sees it."
      onSave={(color) => save.mutateAsync(color)}
      onClose={onClose}
    />
  );
}
