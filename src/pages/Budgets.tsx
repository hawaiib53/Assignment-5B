import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Nav } from '../components/Nav';
import { getCategoryBudgetAmounts, saveCategoryBudgets } from '../lib/budgets';
import type { ExpenseCategory } from '../types';
import { CATEGORIES, CATEGORY_LABELS } from '../types';

const CURRENT_YEAR = new Date().getFullYear();

type AmountInputs = Record<ExpenseCategory, string>;

export function Budgets() {
  const [amounts, setAmounts] = useState<AmountInputs>({
    speaker_fees: '',
    event_supplies: '',
    donations: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getCategoryBudgetAmounts(CURRENT_YEAR)
      .then((current) => {
        if (cancelled) return;
        setAmounts({
          speaker_fees: String(current.speaker_fees ?? 0),
          event_supplies: String(current.event_supplies ?? 0),
          donations: String(current.donations ?? 0),
        });
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load budgets.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);

    const parsed: Partial<Record<ExpenseCategory, number>> = {};
    for (const category of CATEGORIES) {
      const value = Number(amounts[category].replace(/[^0-9.]/g, ''));
      if (!Number.isFinite(value) || value < 0) {
        setError(`Enter a valid budget amount for ${CATEGORY_LABELS[category]}.`);
        return;
      }
      parsed[category] = value;
    }

    setSaving(true);
    try {
      await saveCategoryBudgets(CURRENT_YEAR, parsed as Record<ExpenseCategory, number>);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save budgets.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <Nav />

      <div className="page-header">
        <div>
          <h1 className="page-title">Budgets</h1>
          <p className="page-subtitle">
            Set each category's budget for {CURRENT_YEAR}. Changes show up on the Dashboard immediately.
          </p>
        </div>
      </div>

      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : (
        <form className="form-wrap" onSubmit={handleSubmit}>
          {CATEGORIES.map((category) => (
            <div className="field" key={category} style={{ marginTop: 'var(--space-4)' }}>
              <label htmlFor={`budget-${category}`}>{CATEGORY_LABELS[category]}</label>
              <input
                id={`budget-${category}`}
                className="input"
                inputMode="decimal"
                placeholder="$0.00"
                value={amounts[category]}
                onChange={(e) => setAmounts((prev) => ({ ...prev, [category]: e.target.value }))}
              />
            </div>
          ))}

          {error && <p className="form-error">{error}</p>}
          {saved && <p className="hint">Budgets saved.</p>}

          <button
            type="submit"
            className="btn btn-primary btn-block"
            style={{ marginTop: 'var(--space-6)' }}
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save budgets'}
          </button>
        </form>
      )}
    </div>
  );
}
