import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signUp } from '../lib/auth';

export function Signup() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmSent, setConfirmSent] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!email.trim() || password.length < 6) {
      setError('Enter your email and a password of at least 6 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const data = await signUp(email.trim(), password);
      if (data.session) {
        navigate('/approvals', { replace: true });
      } else {
        setConfirmSent(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign up.');
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmSent) {
    return (
      <div className="page">
        <div className="form-wrap">
          <h1 className="form-title">Check your email</h1>
          <p className="form-subtitle">
            We sent a confirmation link to {email}. Confirm your address, then log in.
          </p>
          <Link to="/login">Back to log in</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <form className="form-wrap" onSubmit={handleSubmit}>
        <h1 className="form-title">Sign up</h1>
        <p className="form-subtitle">Create an account for board / treasurer access to approvals.</p>

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
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && <p className="form-error">{error}</p>}

        <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: 'var(--space-6)' }} disabled={submitting}>
          {submitting ? 'Signing up…' : 'Sign up'}
        </button>

        <p className="hint" style={{ marginTop: 'var(--space-4)' }}>
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </form>
    </div>
  );
}
