import { Route, Routes } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { SubmitExpense } from './pages/SubmitExpense';
import { Approvals } from './pages/Approvals';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/submit-expense" element={<SubmitExpense />} />
      <Route path="/approvals" element={<Approvals />} />
    </Routes>
  );
}

export default App;
