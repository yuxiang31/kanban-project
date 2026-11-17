/**
 * @fileoverview Shell for logged-in pages: header with user menu.
 */

import {Link, NavLink, Outlet, useNavigate} from 'react-router';
import {useAuth} from '../hooks/useAuth.js';
import ThemeToggle from './ThemeToggle.jsx';

export default function AppLayout() {
  const {user, logout} = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/', {replace: true});
  }

  return (
    <>
      <header className="app-header">
        <div className="header-left">
          <Link to="/" className="brand">
            Kanban
          </Link>
          <nav aria-label="Main" className="main-nav">
            <NavLink to="/" end>
              Boards
            </NavLink>
            <NavLink to="/teams">Teams</NavLink>
          </nav>
        </div>
        <div className="user-menu">
          <ThemeToggle />
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
