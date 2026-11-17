/**
 * @fileoverview Shell for logged-in pages: header with user menu.
 */

import {Link, Outlet, useNavigate} from 'react-router';
import {useAuth} from '../hooks/useAuth.js';

export default function AppLayout() {
  const {user, logout} = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login', {replace: true});
  }

  return (
    <>
      <header className="app-header">
        <Link to="/" className="brand">
          Kanban
        </Link>
        <div className="user-menu">
          <span className="user-name">{user.displayName}</span>
          <button type="button" className="button" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </header>
      <Outlet />
    </>
  );
}
