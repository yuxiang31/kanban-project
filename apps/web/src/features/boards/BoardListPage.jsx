import {useState} from 'react';
import {Link} from 'react-router';
import ErrorMessage from '../../components/ErrorMessage.jsx';
import {useBoards} from './boardQueries.js';
import {pluralize} from './boardModel.js';
import CreateBoardDialog from './CreateBoardDialog.jsx';

export default function BoardListPage() {
  const boards = useBoards();
  const [creating, setCreating] = useState(false);

  return (
    <main className="page">
      <div className="page-header">
        <h1>Your boards</h1>
        <button
          type="button"
          className="button primary"
          onClick={() => setCreating(true)}
        >
          New board
        </button>
      </div>
      {boards.isPending && <p role="status">Loading boards…</p>}
      <ErrorMessage error={boards.error} />
      {boards.data?.length === 0 && (
        <p className="empty-state">No boards yet. Create one to get started.</p>
      )}
      {boards.data?.length > 0 && (
        <ul className="board-grid">
          {boards.data.map((board) => (
            <li key={board.id}>
              <Link to={`/boards/${board.id}`} className="board-card">
                <span className="board-card-name">{board.name}</span>
                <span className="muted small">
                  {pluralize(board.taskCount, 'task')}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {creating && <CreateBoardDialog onClose={() => setCreating(false)} />}
    </main>
  );
}
