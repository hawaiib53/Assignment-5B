import { useEffect, useState } from 'react';
import { Nav } from '../components/Nav';
import { StatCard } from '../components/StatCard';
import { CategoryProgress } from '../components/CategoryProgress';
import { ExpenseTable } from '../components/ExpenseTable';
import { getCategorySummaries, getPendingApprovalCount, getRecentExpenses, getYearlySummary } from '../lib/expenses';
import type { CategoryBudgetSummary, Expense, ExpenseCategory, YearlyExpenseSummary } from '../types';
import { CATEGORY_LABELS } from '../types';

const CURRENT_YEAR = new Date().getFullYear();

const currency = (n: number) =>
  n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const CATEGORY_ACCENT: Record<ExpenseCategory, 'primary' | 'secondary'> = {
  speaker_fees: 'primary',
  event_supplies: 'secondary',
  donations: 'primary',
};

export function Dashboard() {
  const [summary, setSummary] = useState<YearlyExpenseSummary | null>(null);
  const [categories, setCategories] = useState<CategoryBudgetSummary[]>([]);
  const [recent, setRecent] = useState<Expense[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      getYearlySummary(CURRENT_YEAR),
      getCategorySummaries(CURRENT_YEAR),
      getRecentExpenses(10),
      getPendingApprovalCount(CURRENT_YEAR),
    ])
      .then(([summaryData, categoryData, recentData, pending]) => {
        if (cancelled) return;
        setSummary(summaryData);
        setCategories(categoryData);
        setRecent(recentData);
        setPendingCount(pending);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load dashboard data.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="page">
      <Nav showNewExpenseButton />

      <div className="page-header">
        <div>
          <h1 className="page-title">Club expenses</h1>
          <p className="page-subtitle">Fiscal year {CURRENT_YEAR} · Jan 1 – Dec 31</p>
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="stat-grid">
        <StatCard value={currency(summary?.total_requested ?? 0)} label="Spent this year" />
        <StatCard value={String(pendingCount)} label="Pending approval" />
        <StatCard value={currency(summary?.yearly_budget ?? 0)} label="Annual budget" />
      </div>

      <div style={{ marginTop: 'var(--space-7)' }}>
        <h2 className="section-title">Budget by category</h2>
        <div className="cat-list">
          {categories.map((cat) => (
            <CategoryProgress
              key={cat.category}
              label={CATEGORY_LABELS[cat.category]}
              spent={cat.total_requested}
              budget={cat.budget_amount}
              accent={CATEGORY_ACCENT[cat.category]}
            />
          ))}
          {!loading && categories.length === 0 && (
            <p className="text-muted">No category budgets configured for {CURRENT_YEAR} yet.</p>
          )}
        </div>
      </div>

      <div style={{ marginTop: 'var(--space-7)' }}>
        <h2 className="section-title">Recent activity</h2>
        {loading ? <p className="text-muted">Loading…</p> : <ExpenseTable expenses={recent} />}
      </div>
    </div>
  );
}
