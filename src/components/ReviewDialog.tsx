import { useEffect, useState } from 'react';
import type { Expense } from '../types';
import { CATEGORY_LABELS } from '../types';
import { approveExpense, denyExpense, getReceiptUrl } from '../lib/expenses';

const currency = (n: number) =>
  n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

interface ReviewDialogProps {
  expense: Expense;
  reviewerEmail: string;
  onClose: () => void;
  onDecided: () => void;
}

export function ReviewDialog({ expense, reviewerEmail, onClose, onDecided }: ReviewDialogProps) {
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [denying, setDenying] = useState(false);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!expense.receipt_path) return;
    let cancelled = false;
    getReceiptUrl(expense.receipt_path)
      .then((url) => {
        if (!cancelled) setReceiptUrl(url);
      })
      .catch(() => {
        /* receipt is optional context; a broken link just doesn't render */
      });
    return () => {
      cancelled = true;
    };
  }, [expense.receipt_path]);

  async function handleApprove() {
    setError(null);
    setSubmitting(true);
    try {
      await approveExpense(expense.id, reviewerEmail);
      onDecided();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve expense.');
      setSubmitting(false);
    }
  }

  async function handleDeny() {
    setError(null);
    if (!reason.trim()) {
      setError('Enter a reason for denying this expense.');
      return;
    }
    setSubmitting(true);
    try {
      await denyExpense(expense.id, reviewerEmail, reason.trim());
      onDecided();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deny expense.');
      setSubmitting(false);
    }
  }

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <h2 className="dialog-title">{expense.items_purchased.join(', ')}</h2>

        <div className="dialog-body">
          <p>
            <strong>{expense.requester_name}</strong> · {CATEGORY_LABELS[expense.category]} ·{' '}
            {formatDate(expense.expense_date)}
          </p>
          <p style={{ fontFamily: 'var(--font-heading)', fontSize: 24, margin: '8px 0' }}>
            {currency(expense.amount)}
          </p>
          {expense.justification && <p>{expense.justification}</p>}
          {expense.review_reason && <p className="hint">Claude's note: {expense.review_reason}</p>}
          {receiptUrl && (
            <p>
              <a href={receiptUrl} target="_blank" rel="noreferrer">
                View receipt
              </a>
            </p>
          )}
        </div>

        {denying && (
          <div className="field">
            <label htmlFor="denyReason">Reason for denial</label>
            <textarea
              id="denyReason"
              className="input"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Let the requester know why this wasn't approved"
              autoFocus
            />
          </div>
        )}

        {error && <p className="form-error">{error}</p>}

        <div className="dialog-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          {denying ? (
            <button type="button" className="btn btn-primary" onClick={handleDeny} disabled={submitting}>
              {submitting ? 'Denying…' : 'Confirm deny'}
            </button>
          ) : (
            <>
              <button type="button" className="btn btn-secondary" onClick={() => setDenying(true)} disabled={submitting}>
                Deny
              </button>
              <button type="button" className="btn btn-primary" onClick={handleApprove} disabled={submitting}>
                {submitting ? 'Approving…' : 'Approve'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
