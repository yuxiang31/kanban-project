import {useState} from 'react';
import {Link, useLocation, useNavigate} from 'react-router';
import {CloseIcon, PlusIcon} from '../../components/Icons.jsx';
import LoadError from '../../components/LoadError.jsx';
import Skeleton from '../../components/Skeleton.jsx';
import {useBoards} from './boardQueries.js';
import {groupBoardsByTeam, pluralize} from './boardModel.js';
import CreateBoardDialog from './CreateBoardDialog.jsx';

export default function BoardListPage() {
  const boards = useBoards();
  const [creating, setCreating] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  // Set after leaving a board: you deleted it, someone else did, or access
  // was lost.
  const notice = location.state?.notice;

  return (
    <main className="page">
      <div className="page-header">
        <h1>Your boards</h1>
        <button
          type="button"
          className="button primary"
          onClick={() => setCreating(true)}
        >
          <PlusIcon />
          New board
        </button>
      </div>
      {notice && (
        <div className="notice" role="status">
          <span>{notice}</span>
          <button
            type="button"
            className="icon-button"
            aria-label="Dismiss"
            onClick={() => navigate('.', {replace: true, state: null})}
          >
            <CloseIcon />
          </button>
        </div>
      )}
      {boards.isPending && <Skeleton label="Loading boards…" />}
      <LoadError error={boards.error} onRetry={() => boards.refetch()} />
      {boards.data?.length === 0 && (
        <div className="empty-state">
          <p>
            No boards yet. A board holds the stages your work moves through.
          </p>
          <button
            type="button"
            className="button"
            onClick={() => setCreating(true)}
          >
            Create your first board
          </button>
        </div>
      )}
      {boards.data?.length > 0 &&
        groupBoardsByTeam(boards.data).map((section) => (
          <section
            key={section.key}
            aria-labelledby={`section-${section.key}`}
            className="board-section"
          >
            <h2 id={`section-${section.key}`} className="section-title">
              {section.title}
            </h2>
            <ul className="board-grid">
              {section.boards.map((board) => (
                <li key={board.id}>
                  <Link
                    to={`/boards/${board.id}`}
                    className="board-card"
                    data-color={board.color ?? undefined}
                  >
                    <span className="board-card-name">{board.name}</span>
                    <span className="muted small">
                      {pluralize(board.taskCount, 'task')}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      {creating && <CreateBoardDialog onClose={() => setCreating(false)} />}
    </main>
  );
}
