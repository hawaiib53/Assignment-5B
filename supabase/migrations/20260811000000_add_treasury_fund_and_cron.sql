-- Treasury fund: the club's on-hand balance, updated by a scheduled
-- back-end job (not computed live on every page load like the budget
-- views). The update itself is a fixed, deterministic calculation — the
-- same starting-balance-minus-approved-expenses math every time.

create table treasury_fund (
  id integer primary key default 1 check (id = 1),
  starting_balance numeric(12,2) not null default 0,
  current_balance numeric(12,2) not null default 0,
  updated_at timestamptz not null default now()
);

insert into treasury_fund (id, starting_balance, current_balance) values (1, 0, 0);

alter table treasury_fund enable row level security;

-- Read-only from the client. starting_balance is set by hand (treasurer,
-- via SQL); current_balance is written only by the scheduled job below,
-- which runs with the privileges of the job owner, not the anon/authenticated
-- roles — so there is no client-facing write policy.
create policy "Anyone can read the treasury fund"
  on treasury_fund for select
  to anon, authenticated
  using (true);

create or replace function recompute_treasury_fund()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update treasury_fund
  set
    current_balance = starting_balance - coalesce(
      (select sum(amount) from expenses where status = 'approved'),
      0
    ),
    updated_at = now()
  where id = 1;
end;
$$;

-- pg_cron schedules run in UTC and don't carry per-job timezones, but
-- "midnight Central" needs to follow US DST rules (UTC-6 in winter,
-- UTC-5 in summer). Rather than hardcoding a UTC hour that would drift an
-- hour off twice a year, fire hourly and let Postgres's own timezone
-- conversion (which does handle DST correctly) gate the actual work to the
-- one hour a day that is midnight in America/Chicago.
create or replace function run_treasury_fund_update_if_midnight_central()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if extract(hour from (now() at time zone 'America/Chicago')) = 0 then
    perform recompute_treasury_fund();
  end if;
end;
$$;

create extension if not exists pg_cron with schema extensions;

select cron.schedule(
  'treasury-fund-nightly-update',
  '0 * * * *',
  $$select run_treasury_fund_update_if_midnight_central();$$
);
