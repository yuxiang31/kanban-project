import {useState} from 'react';
import {Link, useNavigate} from 'react-router';
import {useAuth} from '../../hooks/useAuth.js';
import ErrorMessage from '../../components/ErrorMessage.jsx';
import AuthLayout from './AuthLayout.jsx';
import {validateRegistration} from './validation.js';

export default function RegisterPage() {
  const {register} = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input = {
      username: form.get('username').trim(),
      displayName: form.get('displayName').trim(),
      password: form.get('password'),
    };
    const problem = validateRegistration({
      ...input,
      confirm: form.get('confirm'),
    });
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await register(input);
      navigate('/', {replace: true});
    } catch (err) {
      setError(err);
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title="Create an account">
      <form className="form" onSubmit={handleSubmit} noValidate>
        <label>
          Username
          <input name="username" autoComplete="username" required autoFocus />
        </label>
        <label>
          Display name <span className="muted">(optional)</span>
          <input name="displayName" autoComplete="name" maxLength={60} />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            required
          />
        </label>
        <label>
          Confirm password
          <input
            name="confirm"
            type="password"
            autoComplete="new-password"
            required
          />
        </label>
        <ErrorMessage error={error} />
        <button type="submit" className="button primary" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>
      <p className="muted">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </AuthLayout>
  );
}
