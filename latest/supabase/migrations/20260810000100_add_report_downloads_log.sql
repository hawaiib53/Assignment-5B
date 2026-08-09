-- Audit trail for the treasurer's weekly report download: every time the
-- report is generated, a row is logged here alongside the file itself.

create table report_downloads (
  id uuid primary key default gen_random_uuid(),
  year integer not null,
  expense_count integer not null,
  created_at timestamptz not null default now()
);

alter table report_downloads enable row level security;

create policy "Anyone can log a report download"
  on report_downloads for insert
  to anon, authenticated
  with check (true);

create policy "Anyone can read report download logs"
  on report_downloads for select
  to anon, authenticated
  using (true);
