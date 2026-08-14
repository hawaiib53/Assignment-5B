import { supabase } from './supabaseClient';
import { getExpensesForYear } from './expenses';
import type { Expense } from '../types';
import { CATEGORY_LABELS, STATUS_LABELS } from '../types';

const REPORT_COLUMNS = ['Date', 'Item', 'Submitted by', 'Category', 'Amount', 'Status', 'Review reason', 'Notes'];

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function expensesToCsv(expenses: Expense[]): string {
  const rows = expenses.map((expense) => [
    expense.expense_date,
    expense.items_purchased.join('; '),
    expense.requester_name,
    CATEGORY_LABELS[expense.category],
    expense.amount.toFixed(2),
    STATUS_LABELS[expense.status],
    expense.review_reason ?? '',
    expense.justification ?? '',
  ]);

  return [REPORT_COLUMNS, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
}

async function logReportDownload(year: number, expenseCount: number): Promise<void> {
  const { error } = await supabase.from('report_downloads').insert({ year, expense_count: expenseCount });
  if (error) console.error('Failed to log report download:', error);
}

function triggerCsvDownload(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * The treasurer's weekly report: same steps every time — pull the year's
 * expense log, log that a download happened, then hand the browser a CSV.
 * No model call here; this is a fixed workflow, not a judgment call.
 */
export async function downloadExpenseReport(year: number): Promise<void> {
  const expenses = await getExpensesForYear(year);
  const csv = expensesToCsv(expenses);

  await logReportDownload(year, expenses.length);

  triggerCsvDownload(csv, `st-croix-valley-expenses-${year}.csv`);
}

/**
 * The full approvals report (every expense, every status, no year filter),
 * emailed to whichever logged-in user requested it. The edge function reads
 * the recipient off the caller's session rather than trusting the client, so
 * this always goes to the signed-in user, never an address they typed in.
 */
export async function sendApprovalsReport(): Promise<string> {
  const { data, error } = await supabase.functions.invoke('send-approvals-report', { body: {} });
  if (error) throw error;
  return (data as { sentTo: string }).sentTo;
}
