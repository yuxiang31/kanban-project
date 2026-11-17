import {useId, useState} from 'react';
import {Link, useNavigate} from 'react-router';
import * as api from '../../api/teams.js';
import ErrorMessage from '../../components/ErrorMessage.jsx';
import LoadError from '../../components/LoadError.jsx';
import Skeleton from '../../components/Skeleton.jsx';
import {pluralize} from '../boards/boardModel.js';
import {useTeamMutation, useTeams} from './teamQueries.js';

export default function TeamsPage() {
  const teams = useTeams();
  const navigate = useNavigate();
  const inputId = useId();
  const [name, setName] = useState('');
  const create = useTeamMutation(api.createTeam);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!name.trim()) {
      return;
    }
    try {
      const team = await create.mutateAsync({name: name.trim()});
      navigate(`/teams/${team.id}`);
    } catch {
      // Shown via create.error.
    }
  }

  return (
    <main className="page">
      <h1>Teams</h1>
      <p className="muted">
        Boards shared with a team can be seen and edited by all its members.
      </p>
      <form className="row-form" onSubmit={handleSubmit}>
        <label htmlFor={inputId}>Team name</label>
        <input
          id={inputId}
          value={name}
          maxLength={60}
          onChange={(event) => setName(event.target.value)}
        />
        <button
          type="submit"
          className="button primary"
          disabled={!name.trim() || create.isPending}
        >
          Create team
        </button>
      </form>
      <ErrorMessage error={create.error} />
      {teams.isPending && <Skeleton label="Loading teams…" />}
      <LoadError error={teams.error} onRetry={() => teams.refetch()} />
      {teams.data?.length === 0 && (
        <p className="empty-state">You are not in any teams yet.</p>
      )}
      {teams.data?.length > 0 && (
        <ul className="board-grid">
          {teams.data.map((team) => (
            <li key={team.id}>
              <Link to={`/teams/${team.id}`} className="board-card">
                <span className="board-card-name">{team.name}</span>
                <span className="muted small">
                  {pluralize(team.memberCount, 'member')}
                  {team.isOwner && ' · Owner'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
