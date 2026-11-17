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

/** Renders child routes only for logged-in users. */
export function ProtectedRoute() {
  const {user} = useAuth();
  const location = useLocation();
  return (
    <SessionCheck>
      {user ? (
        <Outlet />
      ) : (
        <Navigate to="/login" replace state={{from: location.pathname}} />
      )}
    </SessionCheck>
  );
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
