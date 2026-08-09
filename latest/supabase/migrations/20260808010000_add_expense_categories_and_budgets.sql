-- Extend expense reimbursement schema to support the club's category-level
-- budgets and board-review status, matching the Dashboard / Submit expense screens.

-- Approval flow needs a distinct in-between state for expenses over $100.
alter type expense_status add value if not exists 'needs_board' after 'pending';
alter type expense_status rename value 'denied' to 'rejected';

create type expense_category as enum ('speaker_fees', 'event_supplies', 'donations');

alter table expenses add column category expense_category;
update expenses set category = 'event_supplies' where category is null;
alter table expenses alter column category set not null;

-- The submission form's "Notes" field is optional; only the item
-- description (items_purchased) is required.
alter table expenses alter column justification drop not null;

create index expenses_category_idx on expenses (category);

-- Per-category budget for a given year (e.g. Speaker Fees: $800 for 2026).
create table category_budgets (
  id uuid primary key default gen_random_uuid(),
  year integer not null,
  category expense_category not null,
  budget_amount numeric(12,2) not null check (budget_amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (year, category)
);

create trigger category_budgets_set_updated_at
before update on category_budgets
for each row execute function set_updated_at();

alter table category_budgets enable row level security;

create policy "Authenticated users can read category_budgets"
  on category_budgets for select
  to authenticated
  using (true);

create policy "Authenticated users can insert category_budgets"
  on category_budgets for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update category_budgets"
  on category_budgets for update
  to authenticated
  using (true);

-- Superseded by category_expense_summary below, which yearly_expense_summary
-- is now derived from.
drop view if exists yearly_expense_summary;

-- Running tally + remaining budget per category per year.
-- Rejected expenses don't count against the budget.
create view category_expense_summary as
select
  cb.year,
  cb.category,
  cb.budget_amount,
  coalesce(sum(e.amount) filter (where e.status <> 'rejected'), 0) as total_requested,
  cb.budget_amount - coalesce(sum(e.amount) filter (where e.status <> 'rejected'), 0) as budget_remaining
from category_budgets cb
left join expenses e
  on e.category = cb.category
  and extract(year from e.expense_date) = cb.year
group by cb.year, cb.category, cb.budget_amount;

-- Same rollup at the whole-year level, for the dashboard's stat row.
create view yearly_expense_summary as
select
  year,
  sum(budget_amount) as yearly_budget,
  sum(total_requested) as total_requested,
  sum(budget_remaining) as budget_remaining
from category_expense_summary
group by year;
