import { supabase } from './supabaseClient';
import type { TreasuryFund } from '../types';

/**
 * Reads the treasury fund balance as of its last scheduled update — this is
 * a stored value written nightly by the treasury-fund-nightly-update cron
 * job, not computed live.
 */
export async function getTreasuryFund(): Promise<TreasuryFund | null> {
  const { data, error } = await supabase
    .from('treasury_fund')
    .select('starting_balance, current_balance, updated_at')
    .eq('id', 1)
    .maybeSingle();

  if (error) throw error;
  return data;
}
