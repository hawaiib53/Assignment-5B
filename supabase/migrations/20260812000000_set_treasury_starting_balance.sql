-- Sets the club's actual opening balance now that it's known, and recomputes
-- immediately so the dashboard reflects it right away rather than waiting
-- for the nightly job.

update treasury_fund set starting_balance = 2500 where id = 1;
select recompute_treasury_fund();
