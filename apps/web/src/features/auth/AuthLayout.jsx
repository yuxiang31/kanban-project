import {Link} from 'react-router';
import ThemeToggle from '../../components/ThemeToggle.jsx';

/**
 * Centered card used by the login and register pages.
 * @param {{title: string, children: *}} props
 */
export default function AuthLayout({title, children}) {
  return (
    <main className="auth-page">
      <div className="auth-theme">
        <ThemeToggle />
      </div>
      <div className="auth-card">
        <Link to="/" className="brand" aria-label="Kanban home">
          Kanban
        </Link>
        <h1>{title}</h1>
        {children}
      </div>
    </main>
  );
}
