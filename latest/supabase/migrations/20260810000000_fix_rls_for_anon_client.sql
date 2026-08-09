-- The app has no login flow: the frontend always talks to Supabase as the
-- anon role. Prior policies were scoped to `authenticated` only, so they
-- never actually applied to real requests from this client. Broaden them.

alter policy "Authenticated users can read expenses" on expenses to anon, authenticated;
alter policy "Authenticated users can insert expenses" on expenses to anon, authenticated;
alter policy "Authenticated users can update expenses" on expenses to anon, authenticated;

alter policy "Authenticated users can read yearly_budgets" on yearly_budgets to anon, authenticated;
alter policy "Authenticated users can insert yearly_budgets" on yearly_budgets to anon, authenticated;
alter policy "Authenticated users can update yearly_budgets" on yearly_budgets to anon, authenticated;

alter policy "Authenticated users can read category_budgets" on category_budgets to anon, authenticated;
alter policy "Authenticated users can insert category_budgets" on category_budgets to anon, authenticated;
alter policy "Authenticated users can update category_budgets" on category_budgets to anon, authenticated;

alter policy "Authenticated users can upload receipts" on storage.objects to anon, authenticated;
alter policy "Authenticated users can read receipts" on storage.objects to anon, authenticated;
