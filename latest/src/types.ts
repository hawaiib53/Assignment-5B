export type ExpenseCategory = 'speaker_fees' | 'event_supplies' | 'donations';
export type ExpenseStatus = 'pending' | 'needs_board' | 'approved' | 'rejected';

export const CATEGORIES: ExpenseCategory[] = ['speaker_fees', 'event_supplies', 'donations'];

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  speaker_fees: 'Speaker Fees',
  event_supplies: 'Event Supplies',
  donations: 'Donations',
};

export const CATEGORY_FORM_LABELS: Record<ExpenseCategory, string> = {
  speaker_fees: 'Speaker',
  event_supplies: 'Supplies',
  donations: 'Donations',
};

export const STATUS_LABELS: Record<ExpenseStatus, string> = {
  pending: 'Pending',
  needs_board: 'Board review',
  approved: 'Approved',
  rejected: 'Rejected',
};

export interface Expense {
  id: string;
  requester_name: string;
  amount: number;
  expense_date: string;
  items_purchased: string[];
  justification: string | null;
  status: ExpenseStatus;
  category: ExpenseCategory;
  receipt_path: string | null;
  review_reason: string | null;
  created_at: string;
}

export interface CategoryBudgetSummary {
  year: number;
  category: ExpenseCategory;
  budget_amount: number;
  total_requested: number;
  budget_remaining: number;
}

export interface YearlyExpenseSummary {
  year: number;
  yearly_budget: number;
  total_requested: number;
  budget_remaining: number;
}

/**
 * The club's on-hand balance. Unlike the budget views above, this isn't
 * computed live — it's written once a day by a scheduled back-end job
 * (see supabase/migrations, `treasury-fund-nightly-update`), so
 * `updated_at` reflects that job's last run, not the current moment.
 */
export interface TreasuryFund {
  starting_balance: number;
  current_balance: number;
  updated_at: string;
}

/**
 * One signal Claude weighs when deciding whether to flag an expense for board
 * review — the other being whether the item/service is unusual for the club.
 * The actual decision is made by the evaluate-expense edge function, not the client.
 */
export const REVIEW_AMOUNT_THRESHOLD = 300;
