-- The treasurer can now have the full approvals report emailed to them
-- on demand (send-approvals-report edge function), in addition to
-- downloading it as a CSV. Both are the same audit log, distinguished by
-- channel. An emailed report isn't scoped to one year, so `year` becomes
-- optional.

alter table report_downloads alter column year drop not null;
alter table report_downloads add column channel text not null default 'download' check (channel in ('download', 'email'));
alter table report_downloads add column recipient_email text;
