-- The Approvals page lets a logged-in board member approve or deny an
-- expense; record who made that call and, for denials, why.

alter table expenses add column reviewed_by text;
alter table expenses add column reviewed_at timestamptz;
alter table expenses add column denial_reason text;

-- Submitting an expense and reading the dashboard stay open to anon (no
-- login required), but approving/denying now goes through Supabase Auth, so
-- only authenticated users may update expenses.
alter policy "Authenticated users can update expenses" on expenses to authenticated;
revoke update on public.expenses from anon;
