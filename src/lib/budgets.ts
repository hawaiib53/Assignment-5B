import { supabase } from './supabaseClient';
import type { ExpenseCategory } from '../types';

export async function getCategoryBudgetAmounts(year: number): Promise<Partial<Record<ExpenseCategory, number>>> {
  const { data, error } = await supabase.from('category_budgets').select('category, budget_amount').eq('year', year);

  if (error) throw error;

  const amounts: Partial<Record<ExpenseCategory, number>> = {};
  for (const row of data ?? []) {
    amounts[row.category as ExpenseCategory] = Number(row.budget_amount);
  }
  return amounts;
}

/** Requires an authenticated session — see the RLS policy on `category_budgets`. */
export async function saveCategoryBudgets(year: number, amounts: Record<ExpenseCategory, number>): Promise<void> {
  const rows = Object.entries(amounts).map(([category, budget_amount]) => ({
    year,
    category: category as ExpenseCategory,
    budget_amount,
  }));

  const { error } = await supabase.from('category_budgets').upsert(rows, { onConflict: 'year,category' });
  if (error) throw error;
}
