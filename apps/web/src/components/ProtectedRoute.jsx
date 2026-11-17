/**
 * @fileoverview Route guards for logged-in and logged-out pages.
 */

import {Navigate, Outlet, useLocation} from 'react-router';
import {useAuth} from '../hooks/useAuth.js';
import ErrorMessage from './ErrorMessage.jsx';

function SessionCheck({children}) {
  const {isLoading, error} = useAuth();
  if (isLoading) {
    return (
      <p role="status" className="page">
        Loading…
      </p>
    );
  }
  if (error) {
    return (
      <main className="page">
        <ErrorMessage error={error} />
      </main>
    );
  }
  return children;
}

/**
 * Renders child routes only for logged-in users. Logged-out visitors get
 * `landing` at the home address and the login page everywhere else.
 * @param {{landing?: *}} props
 */
export function ProtectedRoute({landing = null}) {
  const {user} = useAuth();
  const location = useLocation();
  let content;
  if (user) {
    content = <Outlet />;
  } else if (landing && location.pathname === '/') {
    content = landing;
  } else {
    content = (
      <Navigate to="/login" replace state={{from: location.pathname}} />
    );
  }
  return <SessionCheck>{content}</SessionCheck>;
}

/** Renders child routes only for logged-out users (login, register). */
export function GuestOnlyRoute() {
  const {user} = useAuth();
  return (
    <SessionCheck>
      {user ? <Navigate to="/" replace /> : <Outlet />}
    </SessionCheck>
  );
}
