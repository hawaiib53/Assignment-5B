import type { Expense } from '../types';
import { CATEGORY_LABELS } from '../types';
import { StatusTag } from './StatusTag';

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const currency = (n: number) =>
  n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export function ExpenseTable({ expenses }: { expenses: Expense[] }) {
  if (expenses.length === 0) {
    return <p className="text-muted">No expenses submitted yet.</p>;
  }

  return (
    <table className="table" style={{ width: '100%' }}>
      <thead>
        <tr>
          <th>Date</th>
          <th>Item</th>
          <th>Submitted by</th>
          <th>Category</th>
          <th>Amount</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {expenses.map((expense) => (
          <tr key={expense.id}>
            <td>{formatDate(expense.expense_date)}</td>
            <td>{expense.items_purchased.join(', ')}</td>
            <td>{expense.requester_name}</td>
            <td>{CATEGORY_LABELS[expense.category]}</td>
            <td>{currency(expense.amount)}</td>
            <td>
              <StatusTag status={expense.status} reason={expense.review_reason} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
