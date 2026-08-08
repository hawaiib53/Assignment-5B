import { NavLink, useNavigate } from 'react-router-dom';

interface NavProps {
  showNewExpenseButton?: boolean;
}

export function Nav({ showNewExpenseButton = false }: NavProps) {
  const navigate = useNavigate();

  return (
    <nav className="nav page-nav">
      <span className="nav-brand">Cedar Grove Bird Club</span>
      <NavLink to="/" end>
        Dashboard
      </NavLink>
      <NavLink to="/submit-expense">Submit expense</NavLink>
      <NavLink to="/approvals">Approvals</NavLink>
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
