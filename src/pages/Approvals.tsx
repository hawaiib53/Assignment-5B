import { useCallback, useEffect, useState } from 'react';
import { Nav } from '../components/Nav';
import { ReviewDialog } from '../components/ReviewDialog';
import { getSession } from '../lib/auth';
import { getExpensesByStatus } from '../lib/expenses';
import { sendApprovalsReport } from '../lib/reports';
import type { Expense, ExpenseStatus } from '../types';
import { CATEGORY_LABELS, REVIEW_AMOUNT_THRESHOLD } from '../types';

const TABS: { status: ExpenseStatus; label: string }[] = [
  { status: 'pending', label: 'Pending' },
  { status: 'needs_board', label: 'Needs board' },
  { status: 'approved', label: 'Approved' },
  { status: 'rejected', label: 'Rejected' },
];

const currency = (n: number) =>
  n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function Approvals() {
  const [reviewerEmail, setReviewerEmail] = useState<string | null>(null);
  const [expensesByStatus, setExpensesByStatus] = useState<Record<ExpenseStatus, Expense[]>>({
    pending: [],
    needs_board: [],
    approved: [],
    rejected: [],
  });
  const [activeTab, setActiveTab] = useState<ExpenseStatus>('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<Expense | null>(null);
  const [sendingReport, setSendingReport] = useState(false);
  const [sendReportError, setSendReportError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const loadExpenses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pending, needsBoard, approved, rejected] = await Promise.all([
        getExpensesByStatus('pending'),
        getExpensesByStatus('needs_board'),
        getExpensesByStatus('approved'),
        getExpensesByStatus('rejected'),
      ]);
      setExpensesByStatus({ pending, needs_board: needsBoard, approved, rejected });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load expenses.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    getSession().then((session) => setReviewerEmail(session?.user.email ?? session?.user.id ?? null));
    loadExpenses();
  }, [loadExpenses]);

  const activeExpenses = expensesByStatus[activeTab];
  const isActionable = activeTab === 'pending' || activeTab === 'needs_board';

  async function handleSendReport() {
    setSendReportError(null);
    setSentTo(null);
    setSendingReport(true);
    try {
      const recipient = await sendApprovalsReport();
      setSentTo(recipient);
    } catch (err) {
      setSendReportError(err instanceof Error ? err.message : 'Failed to send report.');
    } finally {
      setSendingReport(false);
    }
  }

  return (
    <div className="page">
      <Nav />

      <div className="page-header">
        <div>
          <h1 className="page-title">Approvals</h1>
          <p className="page-subtitle">
            Expenses flagged as unusual or over ${REVIEW_AMOUNT_THRESHOLD} need board sign-off before they're final.
          </p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={handleSendReport} disabled={sendingReport}>
          {sendingReport ? 'Sending…' : 'Send report to email'}
        </button>
      </div>

      {sendReportError && <p className="form-error">{sendReportError}</p>}
      {sentTo && <p className="hint">Full approvals report sent to {sentTo}.</p>}

      <div className="tab-row">
        {TABS.map((tab) => (
          <button
            key={tab.status}
            type="button"
            className={activeTab === tab.status ? 'tab tab-active' : 'tab'}
            onClick={() => setActiveTab(tab.status)}
          >
            {tab.label} ({expensesByStatus[tab.status].length})
          </button>
        ))}
      </div>

      {error && <p className="form-error">{error}</p>}

      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : activeExpenses.length === 0 ? (
        <p className="text-muted">Nothing here.</p>
      ) : (
        <table className="table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>Submitted by</th>
              <th>Item</th>
              <th>Category</th>
              <th>Amount</th>
              <th>Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {activeExpenses.map((expense) => (
              <tr key={expense.id}>
                <td>{expense.requester_name}</td>
                <td>{expense.items_purchased.join(', ')}</td>
                <td>{CATEGORY_LABELS[expense.category]}</td>
                <td>{currency(expense.amount)}</td>
                <td>{formatDate(expense.expense_date)}</td>
                <td style={{ textAlign: 'right' }}>
                  {isActionable ? (
                    <button type="button" className="btn btn-primary" onClick={() => setReviewing(expense)}>
                      Review
                    </button>
                  ) : (
                    <span className="hint">
                      {expense.status === 'approved' ? 'Approved' : 'Denied'}
                      {expense.reviewed_by ? ` by ${expense.reviewed_by}` : ''}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {reviewing && reviewerEmail && (
        <ReviewDialog
          expense={reviewing}
          reviewerEmail={reviewerEmail}
          onClose={() => setReviewing(null)}
          onDecided={() => {
            setReviewing(null);
            loadExpenses();
          }}
        />
      )}
    </div>
  );
}
