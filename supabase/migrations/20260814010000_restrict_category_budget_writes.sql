-- Category budgets can now be edited from a logged-in-only page (the new
-- Budgets screen). Reading stays open to anon so the public Dashboard can
-- still show budget-vs-spent figures without requiring login, but writing
-- now requires authentication, the same rule already applied to
-- approving/denying expenses.

alter policy "Authenticated users can insert category_budgets" on category_budgets to authenticated;
alter policy "Authenticated users can update category_budgets" on category_budgets to authenticated;

revoke insert, update on public.category_budgets from anon;
