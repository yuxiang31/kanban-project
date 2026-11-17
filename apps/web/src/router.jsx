/**
 * @fileoverview Route table.
 */

import {Link} from 'react-router';
import AppLayout from './components/AppLayout.jsx';
import {GuestOnlyRoute, ProtectedRoute} from './components/ProtectedRoute.jsx';
import LoginPage from './features/auth/LoginPage.jsx';
import RegisterPage from './features/auth/RegisterPage.jsx';
import BoardListPage from './features/boards/BoardListPage.jsx';
import BoardPage from './features/boards/BoardPage.jsx';

function NotFoundPage() {
  return (
    <main className="page">
      <h1>Page not found</h1>
      <Link to="/">Go home</Link>
    </main>
  );
}

export const routes = [
  {
    element: <GuestOnlyRoute />,
    children: [
      {path: '/login', element: <LoginPage />},
      {path: '/register', element: <RegisterPage />},
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {path: '/', element: <BoardListPage />},
          {path: '/boards/:boardId', element: <BoardPage />},
        ],
      },
    ],
  },
  {path: '*', element: <NotFoundPage />},
];
