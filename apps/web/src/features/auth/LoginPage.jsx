import {useState} from 'react';
import {Link, useLocation, useNavigate} from 'react-router';
import {useAuth} from '../../hooks/useAuth.js';
import ErrorMessage from '../../components/ErrorMessage.jsx';
import AuthLayout from './AuthLayout.jsx';

export default function LoginPage() {
  const {login} = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    setSubmitting(true);
    try {
      await login({
        username: form.get('username').trim(),
        password: form.get('password'),
      });
      navigate(location.state?.from ?? '/', {replace: true});
    } catch (err) {
      setError(err);
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title="Log in">
      <form className="form" onSubmit={handleSubmit}>
        <label>
          Username
          <input name="username" autoComplete="username" required autoFocus />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </label>
        <ErrorMessage error={error} />
        <button type="submit" className="button primary" disabled={submitting}>
          {submitting ? 'Logging in…' : 'Log in'}
        </button>
      </form>
      <p className="muted">
        New here? <Link to="/register">Create an account</Link>
      </p>
    </AuthLayout>
  );
}
