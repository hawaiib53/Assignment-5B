import { supabase } from './supabaseClient';
import type { CategoryBudgetSummary, Expense, ExpenseCategory, ExpenseStatus, YearlyExpenseSummary } from '../types';

export async function getYearlySummary(year: number): Promise<YearlyExpenseSummary | null> {
  const { data, error } = await supabase
    .from('yearly_expense_summary')
    .select('*')
    .eq('year', year)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getCategorySummaries(year: number): Promise<CategoryBudgetSummary[]> {
  const { data, error } = await supabase
    .from('category_expense_summary')
    .select('*')
    .eq('year', year)
    .order('category');

  if (error) throw error;
  return data ?? [];
}

export async function getRecentExpenses(limit = 10): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .order('expense_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function getExpensesForYear(year: number): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .gte('expense_date', `${year}-01-01`)
    .lte('expense_date', `${year}-12-31`)
    .order('expense_date', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

const AWAITING_APPROVAL_STATUSES: ExpenseStatus[] = ['pending', 'needs_board'];

export async function getPendingApprovalCount(year: number): Promise<number> {
  const { count, error } = await supabase
    .from('expenses')
    .select('*', { count: 'exact', head: true })
    .in('status', AWAITING_APPROVAL_STATUSES)
    .gte('expense_date', `${year}-01-01`)
    .lte('expense_date', `${year}-12-31`);

  if (error) throw error;
  return count ?? 0;
}

export interface NewExpenseInput {
  requesterName: string;
  itemDescription: string;
  category: ExpenseCategory;
  amount: number;
  expenseDate: string;
  notes?: string;
  receiptFile?: File;
}

/**
 * Uploads the receipt (if any) then hands the expense off to the
 * evaluate-expense edge function, which asks Claude to decide whether it
 * needs board review (based on amount and how unusual the item is) before
 * inserting the record.
 */
export async function submitExpense(input: NewExpenseInput): Promise<Expense> {
  let receiptPath: string | null = null;
  if (input.receiptFile) {
    // Build the storage path from a fresh UUID rather than the original
    // filename — user-supplied filenames often contain spaces or other
    // characters Supabase Storage rejects as an invalid object path.
    const dotIndex = input.receiptFile.name.lastIndexOf('.');
    const extension = dotIndex > 0 ? input.receiptFile.name.slice(dotIndex + 1).replace(/[^a-zA-Z0-9]/g, '') : '';
    const path = extension ? `${crypto.randomUUID()}.${extension}` : crypto.randomUUID();
    const { error: uploadError } = await supabase.storage.from('receipts').upload(path, input.receiptFile);
    if (uploadError) throw uploadError;
    receiptPath = path;
  }

  const { data, error } = await supabase.functions.invoke('evaluate-expense', {
    body: {
      requesterName: input.requesterName,
      itemDescription: input.itemDescription,
      category: input.category,
      amount: input.amount,
      expenseDate: input.expenseDate,
      notes: input.notes,
      receiptPath,
    },
  });

  if (error) throw error;
  return data as Expense;
}
