import { Route, Routes } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { SubmitExpense } from './pages/SubmitExpense';
import { Approvals } from './pages/Approvals';
import { Budgets } from './pages/Budgets';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { ProtectedRoute } from './components/ProtectedRoute';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/submit-expense" element={<SubmitExpense />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route
        path="/approvals"
        element={
          <ProtectedRoute>
            <Approvals />
          </ProtectedRoute>
        }
      />
      <Route
        path="/budgets"
        element={
          <ProtectedRoute>
            <Budgets />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
