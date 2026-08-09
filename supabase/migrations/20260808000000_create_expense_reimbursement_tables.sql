-- Expense reimbursement schema
-- Tables: yearly_budgets, expenses
-- View: yearly_expense_summary (running tally + remaining budget)

create extension if not exists "pgcrypto";

create type expense_status as enum ('pending', 'approved', 'denied');

-- One row per fiscal/calendar year budget
create table yearly_budgets (
  id uuid primary key default gen_random_uuid(),
  year integer not null unique,
  budget_amount numeric(12,2) not null check (budget_amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Individual reimbursement entries
create table expenses (
  id uuid primary key default gen_random_uuid(),
  requester_name text not null,
  amount numeric(10,2) not null check (amount > 0),
  expense_date date not null,
  items_purchased text[] not null default '{}',
  justification text not null,
  status expense_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index expenses_expense_date_idx on expenses (expense_date);
create index expenses_status_idx on expenses (status);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger expenses_set_updated_at
before update on expenses
for each row execute function set_updated_at();

create trigger yearly_budgets_set_updated_at
before update on yearly_budgets
for each row execute function set_updated_at();

-- Running tally of expenses requested to date, and budget remaining, per year.
-- Computed on read so it never drifts out of sync with the underlying rows.
create view yearly_expense_summary as
select
  b.year,
  b.budget_amount as yearly_budget,
  coalesce(sum(e.amount), 0) as total_requested,
  b.budget_amount - coalesce(sum(e.amount), 0) as budget_remaining
from yearly_budgets b
left join expenses e
  on extract(year from e.expense_date) = b.year
group by b.year, b.budget_amount;

alter table expenses enable row level security;
alter table yearly_budgets enable row level security;

create policy "Authenticated users can read expenses"
  on expenses for select
  to authenticated
  using (true);

create policy "Authenticated users can insert expenses"
  on expenses for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update expenses"
  on expenses for update
  to authenticated
  using (true);

create policy "Authenticated users can read yearly_budgets"
  on yearly_budgets for select
  to authenticated
  using (true);

create policy "Authenticated users can insert yearly_budgets"
  on yearly_budgets for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update yearly_budgets"
  on yearly_budgets for update
  to authenticated
  using (true);
