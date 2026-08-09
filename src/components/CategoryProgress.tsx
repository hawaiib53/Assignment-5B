interface CategoryProgressProps {
  label: string;
  spent: number;
  budget: number;
  accent?: 'primary' | 'secondary';
}

const currency = (n: number) =>
  n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export function CategoryProgress({ label, spent, budget, accent = 'primary' }: CategoryProgressProps) {
  const pct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;

  return (
    <div className="cat-row">
      <div className="cat-top">
        <span>{label}</span>
        <span>
          {currency(spent)} / {currency(budget)}
        </span>
      </div>
      <div className="bar-track">
        <div
          className={accent === 'secondary' ? 'bar-fill bar-fill-accent-2' : 'bar-fill'}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
