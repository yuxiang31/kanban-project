import {useState} from 'react';
import {Link, useLocation, useNavigate, useSearchParams} from 'react-router';
import {CloseIcon, PeopleIcon, PlusIcon} from '../../components/Icons.jsx';
import LoadError from '../../components/LoadError.jsx';
import Skeleton from '../../components/Skeleton.jsx';
import {useBoards} from './boardQueries.js';
import {groupBoardsByTeam, pluralize} from './boardModel.js';
import CreateBoardDialog from './CreateBoardDialog.jsx';
import DueBadge from './DueBadge.jsx';
import {BOARD_SORTS, sortBoards} from './dueDate.js';

const SORT_PARAM = 'sort';

/**
 * Newest first is grouped by team; by due date it is one list, so the
 * nearest deadline is at the top whichever team it belongs to.
 * @param {!Array<!Object>} boards
 * @param {string} sort
 */
function boardSections(boards, sort) {
  if (sort === 'due') {
    return [
      {
        key: 'due',
        title: 'All boards by due date',
        boards: sortBoards(boards, sort),
      },
    ];
  }
  return groupBoardsByTeam(boards);
}

export default function BoardListPage() {
  const boards = useBoards();
  const [creating, setCreating] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  // Set after leaving a board: you deleted it, someone else did, or access
  // was lost.
  const notice = location.state?.notice;
  const [searchParams, setSearchParams] = useSearchParams();
  const sort = BOARD_SORTS.some((s) => s.value === searchParams.get(SORT_PARAM))
    ? searchParams.get(SORT_PARAM)
    : BOARD_SORTS[0].value;

  function setSort(value) {
    setSearchParams(
      (params) => {
        if (value === BOARD_SORTS[0].value) {
          params.delete(SORT_PARAM);
        } else {
          params.set(SORT_PARAM, value);
        }
        return params;
      },
      {replace: true},
    );
  }

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
      {boards.data?.length > 0 && (
        <div
          className="chips sort-chips"
          role="group"
          aria-labelledby="board-sort-label"
        >
          <span id="board-sort-label" className="muted small">
            Sort by
          </span>
          {BOARD_SORTS.map((option) => (
            <button
              key={option.value}
              type="button"
              className="chip"
              aria-pressed={sort === option.value}
              onClick={() => setSort(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
      {boards.data?.length > 0 &&
        boardSections(boards.data, sort).map((section) => (
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
                    {board.description && (
                      <span className="board-card-desc">
                        {board.description}
                      </span>
                    )}
                    <span className="board-card-meta">
                      <span className="board-card-stats muted small">
                        <PeopleIcon />
                        {pluralize(board.memberCount, 'member')} ·{' '}
                        {pluralize(board.taskCount, 'task')}
                        {sort === 'due' && board.team && (
                          <span className="board-card-team">
                            {board.team.name}
                          </span>
                        )}
                      </span>
                      {board.dueDate && <DueBadge dueDate={board.dueDate} />}
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
