/**
 * @fileoverview Route table. Feature routes are added phase by phase.
 */

import {Link} from 'react-router';

/** Placeholder home page until boards land in Phase 2. */
function HomePage() {
  return (
    <main className="page">
      <h1>Kanban</h1>
      <p>Track your work on boards, alone or with your team.</p>
    </main>
  );
}

function NotFoundPage() {
  return (
    <main className="page">
      <h1>Page not found</h1>
      <Link to="/">Go home</Link>
    </main>
  );
}

export const routes = [
  {path: '/', element: <HomePage />},
  {path: '*', element: <NotFoundPage />},
];
