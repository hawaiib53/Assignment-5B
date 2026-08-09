import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Nav } from '../components/Nav';
import { submitExpense } from '../lib/expenses';
import type { ExpenseCategory } from '../types';
import { CATEGORIES, CATEGORY_FORM_LABELS, REVIEW_AMOUNT_THRESHOLD } from '../types';

export function SubmitExpense() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [requesterName, setRequesterName] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('speaker_fees');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState('');
  const [notes, setNotes] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFiles(files: FileList | null) {
    if (files && files[0]) setReceiptFile(files[0]);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const parsedAmount = Number(amount);
    if (!requesterName.trim() || !itemDescription.trim() || !expenseDate || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Please fill in your name, what it was for, a valid amount, and the date.');
      return;
    }

    setSubmitting(true);
    try {
      await submitExpense({
        requesterName: requesterName.trim(),
        itemDescription: itemDescription.trim(),
        category,
        amount: parsedAmount,
        expenseDate,
        notes: notes.trim() || undefined,
        receiptFile: receiptFile ?? undefined,
      });
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong submitting your expense.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <Nav />

      <form className="form-wrap" onSubmit={handleSubmit}>
        <h1 className="form-title">Submit an expense</h1>
        <p className="form-subtitle">
          Expenses are automatically screened. Large (generally over ${REVIEW_AMOUNT_THRESHOLD}) or unusual
          purchases get flagged for the board.
        </p>

        <div className="field">
          <label htmlFor="requesterName">Your name</label>
          <input
            id="requesterName"
            className="input"
            placeholder="e.g. Rosa Martinez"
            value={requesterName}
            onChange={(e) => setRequesterName(e.target.value)}
          />
        </div>

        <div className="field" style={{ marginTop: 'var(--space-4)' }}>
          <label htmlFor="itemDescription">What was it for?</label>
          <input
            id="itemDescription"
            className="input"
            placeholder="e.g. Feeder seed for the nature center"
            value={itemDescription}
            onChange={(e) => setItemDescription(e.target.value)}
          />
        </div>

        <div className="field" style={{ marginTop: 'var(--space-4)' }}>
          <span>Category</span>
          <div className="seg" role="radiogroup" aria-label="Category" style={{ whiteSpace: 'nowrap', marginTop: 5 }}>
            {CATEGORIES.map((cat) => (
              <label key={cat} className="seg-opt">
                <input
                  type="radio"
                  name="category"
                  value={cat}
                  checked={category === cat}
                  onChange={() => setCategory(cat)}
                />
                {CATEGORY_FORM_LABELS[cat]}
              </label>
            ))}
          </div>
        </div>

        <div className="field" style={{ marginTop: 'var(--space-4)' }}>
          <label htmlFor="amount">Amount</label>
          <input
            id="amount"
            className="input"
            inputMode="decimal"
            placeholder="$0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <div className="field" style={{ marginTop: 'var(--space-4)' }}>
          <label htmlFor="expenseDate">Date of purchase</label>
          <input
            id="expenseDate"
            className="input"
            type="date"
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
          />
        </div>

        <div className="field" style={{ marginTop: 'var(--space-4)' }}>
          <label>Receipt</label>
          <div
            className={dragActive ? 'dropzone dropzone-active' : 'dropzone'}
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              handleFiles(e.dataTransfer.files);
            }}
          >
            {receiptFile ? (
              <span className="dropzone-filename">{receiptFile.name}</span>
            ) : (
              'Drop a photo of your receipt here, or click to upload'
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              style={{ display: 'none' }}
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>
          <p className="hint">A clear photo of the receipt or invoice speeds up approval.</p>
        </div>

        <div className="field" style={{ marginTop: 'var(--space-4)' }}>
          <label htmlFor="notes">Notes (optional)</label>
          <input
            id="notes"
            className="input"
            placeholder="Anything the treasurer should know"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {error && <p className="form-error">{error}</p>}

        <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: 'var(--space-6)' }} disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit for approval'}
        </button>
      </form>
    </div>
  );
}
