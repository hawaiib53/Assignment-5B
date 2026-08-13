import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { getSession, onAuthStateChange, signOut } from '../lib/auth';

interface NavProps {
  showNewExpenseButton?: boolean;
}

export function Nav({ showNewExpenseButton = false }: NavProps) {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    getSession().then(setSession);
    return onAuthStateChange(setSession);
  }, []);

  async function handleLogout() {
    await signOut();
    navigate('/');
  }

  return (
    <nav className="nav page-nav">
      <span className="nav-brand">St. Croix Valley Bird Club</span>
      <NavLink to="/" end>
        Dashboard
      </NavLink>
      <NavLink to="/submit-expense">Submit expense</NavLink>
      <NavLink to="/approvals">Approvals</NavLink>
      {session && (
        <button type="button" className="btn btn-secondary" onClick={handleLogout}>
          Log out
        </button>
      )}
      {showNewExpenseButton && (
        <button
          type="button"
          className="btn btn-primary"
          style={{ whiteSpace: 'nowrap' }}
          onClick={() => navigate('/submit-expense')}
        >
          + New expense
        </button>
      )}
    </nav>
  );
}
