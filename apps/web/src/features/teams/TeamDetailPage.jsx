/**
 * @fileoverview A team's members. The owner renames or deletes the team,
 * adds people by username and removes them; other members can leave.
 */

import {useId, useState} from 'react';
import {Link, useNavigate, useParams} from 'react-router';
import {useQueryClient} from '@tanstack/react-query';
import * as api from '../../api/teams.js';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import ErrorMessage from '../../components/ErrorMessage.jsx';
import InlineEditForm from '../../components/InlineEditForm.jsx';
import {useAuth} from '../../hooks/useAuth.js';
import {pluralize} from '../boards/boardModel.js';
import {teamKey, teamsKey, useTeam, useTeamMutation} from './teamQueries.js';

export default function TeamDetailPage() {
  const teamId = Number(useParams().teamId);
  const team = useTeam(teamId);

  if (team.isPending) {
    return (
      <p role="status" className="page">
        Loading team…
      </p>
    );
  }
  if (team.error) {
    return (
      <main className="page">
        <ErrorMessage error={team.error} />
        <Link to="/teams">Back to teams</Link>
      </main>
    );
  }
  return <TeamView team={team.data} />;
}

/** @param {{team: !Object}} props */
function TeamView({team}) {
  const {user} = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [renaming, setRenaming] = useState(false);
  const [removing, setRemoving] = useState(null);
  const [leaving, setLeaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const remove = useTeamMutation((userId) => api.removeMember(team.id, userId));
  const rename = useTeamMutation((name) => api.renameTeam(team.id, {name}));

  /**
   * Runs an action that ends this user's view of the team (leave, delete),
   * then goes back to the team list. The team's own query is dropped rather
   * than refetched, since it would now answer 404.
   */
  async function exitTeam(action) {
    await action();
    queryClient.removeQueries({queryKey: teamKey(team.id)});
    await Promise.all([
      queryClient.invalidateQueries({queryKey: teamsKey, exact: true}),
      queryClient.invalidateQueries({queryKey: ['boards']}),
    ]);
    navigate('/teams', {replace: true});
  }

  return (
    <main className="page">
      <p className="muted small">
        <Link to="/teams">Teams</Link> /
      </p>
      <div className="page-header">
        {renaming ? (
          <InlineEditForm
            label="Team name"
            initialValue={team.name}
            maxLength={60}
            onSave={async (name) => {
              await rename.mutateAsync(name);
              setRenaming(false);
            }}
            onCancel={() => setRenaming(false)}
          />
        ) : (
          <h1>{team.name}</h1>
        )}
        <div className="board-actions">
          {team.isOwner && !renaming && (
            <button
              type="button"
              className="button"
              onClick={() => setRenaming(true)}
            >
              Rename team
            </button>
          )}
          {team.isOwner ? (
            <button
              type="button"
              className="button danger-outline"
              onClick={() => setDeleting(true)}
            >
              Delete team
            </button>
          ) : (
            <button
              type="button"
              className="button danger-outline"
              onClick={() => setLeaving(true)}
            >
              Leave team
            </button>
          )}
        </div>
      </div>
      {team.isOwner && <AddMemberForm teamId={team.id} />}
      <h2 className="section-title">Members</h2>
      <ul className="member-list">
        {team.members.map((member) => (
          <li key={member.id} className="member">
            <span>
              <strong>{member.displayName}</strong>{' '}
              <span className="muted">@{member.username}</span>
              {member.id === team.ownerId && (
                <span className="badge">Owner</span>
              )}
              {member.id === user.id && <span className="badge">You</span>}
            </span>
            {team.isOwner && member.id !== team.ownerId && (
              <button
                type="button"
                className="button danger-outline"
                aria-label={`Remove ${member.displayName}`}
                onClick={() => setRemoving(member)}
              >
                Remove
              </button>
            )}
          </li>
        ))}
      </ul>
      {removing && (
        <ConfirmDialog
          title="Remove member?"
          confirmLabel="Remove"
          onConfirm={async () => {
            await remove.mutateAsync(removing.id);
            setRemoving(null);
          }}
          onCancel={() => setRemoving(null)}
        >
          <p>
            <strong>{removing.displayName}</strong> will lose access to this
            team’s boards and be unassigned from its tasks.
          </p>
        </ConfirmDialog>
      )}
      {deleting && (
        <ConfirmDialog
          title="Delete team?"
          onConfirm={() => exitTeam(() => api.deleteTeam(team.id))}
          onCancel={() => setDeleting(false)}
        >
          <p>
            <strong>{team.name}</strong>
            {team.boardCount > 0
              ? ` and its ${pluralize(team.boardCount, 'board')} (with all their tasks) will be deleted for everyone.`
              : ' will be deleted.'}{' '}
            This cannot be undone.
          </p>
        </ConfirmDialog>
      )}
      {leaving && (
        <ConfirmDialog
          title="Leave team?"
          confirmLabel="Leave"
          onConfirm={() => exitTeam(() => api.removeMember(team.id, user.id))}
          onCancel={() => setLeaving(false)}
        >
          <p>
            You will lose access to <strong>{team.name}</strong>’s boards. The
            owner can add you back.
          </p>
        </ConfirmDialog>
      )}
    </main>
  );
}

/** @param {{teamId: number}} props */
function AddMemberForm({teamId}) {
  const inputId = useId();
  const [username, setUsername] = useState('');
  const add = useTeamMutation((name) => api.addMember(teamId, name));

  async function handleSubmit(event) {
    event.preventDefault();
    if (!username.trim()) {
      return;
    }
    try {
      await add.mutateAsync(username.trim());
      setUsername('');
    } catch {
      // Shown via add.error.
    }
  }

  return (
    <>
      <form className="row-form" onSubmit={handleSubmit}>
        <label htmlFor={inputId}>Username</label>
        <input
          id={inputId}
          value={username}
          maxLength={32}
          autoComplete="off"
          onChange={(event) => setUsername(event.target.value)}
        />
        <button
          type="submit"
          className="button primary"
          disabled={!username.trim() || add.isPending}
        >
          Add member
        </button>
      </form>
      <ErrorMessage error={add.error} />
    </>
  );
}
