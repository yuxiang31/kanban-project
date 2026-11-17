import {useState} from 'react';
import {useNavigate} from 'react-router';
import * as api from '../../api/boards.js';
import ColorPicker from '../../components/ColorPicker.jsx';
import ErrorMessage from '../../components/ErrorMessage.jsx';
import Modal from '../../components/Modal.jsx';
import {useTeams} from '../teams/teamQueries.js';
import {useBoardMutation} from './boardQueries.js';

/** @param {{onClose: function()}} props */
export default function CreateBoardDialog({onClose}) {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [teamId, setTeamId] = useState('');
  const [color, setColor] = useState(null);
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const teams = useTeams();
  const create = useBoardMutation(api.createBoard);

  async function handleSubmit(event) {
    event.preventDefault();
    const board = await create.mutateAsync({
      name: name.trim(),
      ...(teamId && {teamId: Number(teamId)}),
      ...(description.trim() && {description: description.trim()}),
      ...(color && {color}),
      ...(dueDate && {dueDate}),
    });
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
        <label>
          <span>
            What is this board for? <span className="muted">(optional)</span>
          </span>
          <textarea
            value={description}
            maxLength={1000}
            rows={4}
            placeholder="e.g. Everything needed to ship v2 by March"
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
        <label>
          <span>
            Due date <span className="muted">(optional)</span>
          </span>
          <input
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
          />
        </label>
        <label>
          Share with
          <select
            value={teamId}
            onChange={(event) => setTeamId(event.target.value)}
          >
            <option value="">Only me</option>
            {teams.data?.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </label>
        <ColorPicker value={color} onChange={setColor} />
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
