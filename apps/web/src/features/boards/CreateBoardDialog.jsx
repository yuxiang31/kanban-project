import {useState} from 'react';
import {useNavigate} from 'react-router';
import * as api from '../../api/boards.js';
import ErrorMessage from '../../components/ErrorMessage.jsx';
import Modal from '../../components/Modal.jsx';
import {useBoardMutation} from './boardQueries.js';

/** @param {{onClose: function()}} props */
export default function CreateBoardDialog({onClose}) {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const create = useBoardMutation(api.createBoard);

  async function handleSubmit(event) {
    event.preventDefault();
    const board = await create.mutateAsync({name: name.trim()});
    navigate(`/boards/${board.id}`);
  }

  return (
    <Modal title="New board" onClose={onClose}>
      <form className="form" onSubmit={(e) => handleSubmit(e).catch(() => {})}>
        <label>
          Board name
          <input
            value={name}
            maxLength={100}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <p className="muted small">
          Starts with To Do, In Progress and Done. You can change the stages
          later.
        </p>
        <ErrorMessage error={create.error} />
        <div className="dialog-actions">
          <button type="button" className="button" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className="button primary"
            disabled={!name.trim() || create.isPending}
          >
            Create
          </button>
        </div>
      </form>
    </Modal>
  );
}
