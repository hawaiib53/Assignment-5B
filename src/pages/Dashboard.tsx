import { useEffect, useState } from 'react';
import { Nav } from '../components/Nav';
import { StatCard } from '../components/StatCard';
import { CategoryProgress } from '../components/CategoryProgress';
import { ExpenseTable } from '../components/ExpenseTable';
import { getCategorySummaries, getPendingApprovalCount, getRecentExpenses, getYearlySummary } from '../lib/expenses';
import { downloadExpenseReport } from '../lib/reports';
import { getTreasuryFund } from '../lib/treasury';
import type { CategoryBudgetSummary, Expense, ExpenseCategory, TreasuryFund, YearlyExpenseSummary } from '../types';
import { CATEGORY_LABELS } from '../types';

const CURRENT_YEAR = new Date().getFullYear();

const currency = (n: number) =>
  n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const formatSyncTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

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
  const [treasuryFund, setTreasuryFund] = useState<TreasuryFund | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      getYearlySummary(CURRENT_YEAR),
      getCategorySummaries(CURRENT_YEAR),
      getRecentExpenses(10),
      getPendingApprovalCount(CURRENT_YEAR),
      getTreasuryFund(),
    ])
      .then(([summaryData, categoryData, recentData, pending, treasuryData]) => {
        if (cancelled) return;
        setSummary(summaryData);
        setCategories(categoryData);
        setRecent(recentData);
        setPendingCount(pending);
        setTreasuryFund(treasuryData);
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

  async function handleDownloadReport() {
    setDownloadError(null);
    setDownloading(true);
    try {
      await downloadExpenseReport(CURRENT_YEAR);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : 'Failed to download report.');
    } finally {
      setDownloading(false);
    }
  }

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

      {treasuryFund && (
        <div className="stat-card" style={{ marginBottom: 'var(--space-4)' }}>
          <div className="stat-num">{currency(treasuryFund.current_balance)}</div>
          <div className="stat-label">Treasury fund</div>
          <p className="hint" style={{ marginTop: 6 }}>
            Updated nightly at midnight Central · last synced {formatSyncTime(treasuryFund.updated_at)}
          </p>
        </div>
      )}

      <div className="stat-grid">
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
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <h2 className="section-title">Recent activity</h2>
          <button type="button" className="btn btn-secondary" onClick={handleDownloadReport} disabled={downloading}>
            {downloading ? 'Preparing…' : 'Download report'}
          </button>
        </div>
        {downloadError && <p className="form-error">{downloadError}</p>}
        {loading ? <p className="text-muted">Loading…</p> : <ExpenseTable expenses={recent} />}
      </div>
    </div>
  );
}
