import { supabase } from './supabaseClient';
import type { CategoryBudgetSummary, Expense, ExpenseCategory, ExpenseStatus, YearlyExpenseSummary } from '../types';
import { BOARD_REVIEW_THRESHOLD } from '../types';

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

export async function submitExpense(input: NewExpenseInput): Promise<Expense> {
  const status: ExpenseStatus = input.amount > BOARD_REVIEW_THRESHOLD ? 'needs_board' : 'pending';

  let receiptPath: string | null = null;
  if (input.receiptFile) {
    const path = `${crypto.randomUUID()}-${input.receiptFile.name}`;
    const { error: uploadError } = await supabase.storage.from('receipts').upload(path, input.receiptFile);
    if (uploadError) throw uploadError;
    receiptPath = path;
  }

  const { data, error } = await supabase
    .from('expenses')
    .insert({
      requester_name: input.requesterName,
      amount: input.amount,
      expense_date: input.expenseDate,
      items_purchased: [input.itemDescription],
      justification: input.notes || null,
      category: input.category,
      status,
      receipt_path: receiptPath,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
