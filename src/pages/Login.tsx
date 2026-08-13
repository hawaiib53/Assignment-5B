import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { signIn } from '../lib/auth';

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/approvals';

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }

    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log in.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <form className="form-wrap" onSubmit={handleSubmit}>
        <h1 className="form-title">Log in</h1>
        <p className="form-subtitle">Board / treasurer sign-in for the approvals queue.</p>

        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            className="input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="field" style={{ marginTop: 'var(--space-4)' }}>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            className="input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && <p className="form-error">{error}</p>}

        <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: 'var(--space-6)' }} disabled={submitting}>
          {submitting ? 'Logging in…' : 'Log in'}
        </button>

        <p className="hint" style={{ marginTop: 'var(--space-4)' }}>
          Need an account? <Link to="/signup">Sign up</Link>
        </p>
      </form>
    </div>
  );
}
