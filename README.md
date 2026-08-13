# St. Croix Valley Bird Club — Expenses

A member-facing expense submission and dashboard app for the club. React + TypeScript + Vite frontend, Supabase (Postgres) backend.

## What this app does

Members submit expense reimbursement requests through the app. Each submission is automatically reviewed and routed to one of three outcomes — auto-approved, pending normal treasurer approval, or flagged for board review — without anyone having to apply a fixed dollar cutoff by hand. The Dashboard gives any member a live view of the year's spending, budget remaining by category, the club's on-hand treasury balance, and a log of recent activity. The treasurer can pull a full CSV report of the expense log on demand for their weekly review.

Concretely, the app is built around three things happening together:

- **Submission + review** — a member fills out the Submit expense form; Claude decides in real time whether it needs board review, then the record is written to the database. See `supabase/functions/evaluate-expense/`.
- **Reporting** — anyone can download a CSV snapshot of the year's expense log from the Dashboard, which also logs that the download happened. See `src/lib/reports.ts`.
- **Treasury tracking** — the club's on-hand balance is recalculated automatically once a day and shown on the Dashboard, separately from the budget-vs-spent figures (which are always live). See the `treasury_fund` table and its cron job in `supabase/migrations/`.

## On-demand vs. scheduled

The app has one piece that runs on a timer and everything else runs only when someone takes an action:

| Piece | Trigger | Where |
|---|---|---|
| **Expense review** (Claude decides pending / needs board / auto-approved) | On-demand — fires every time a member submits the form | `supabase/functions/evaluate-expense/` |
| **Report download** (CSV export + audit log entry) | On-demand — fires whenever anyone clicks "Download report" on the Dashboard | `src/lib/reports.ts`, logged to the `report_downloads` table |
| **Treasury fund balance** | **Scheduled** — a `pg_cron` job runs once a day at midnight Central time (handled via an hourly check so it tracks CDT/CST correctly) and recalculates the balance from all approved expenses | `treasury-fund-nightly-update` cron job + `recompute_treasury_fund()`, both in `supabase/migrations/` |

The practical difference shows up on the Dashboard: the "Spent this year" and "Budget by category" figures are always current (computed live from the database on every page load), while the "Treasury fund" figure only updates once a day and shows a "last synced" timestamp so it's clear it isn't live.

## Setup

1. `npm install`
2. Create a Supabase project, then run the migrations in `supabase/migrations/` against it (via the Supabase CLI's `supabase db push`, or paste them into the SQL editor in order).
3. Copy `.env.example` to `.env.local` and fill in your project's URL and anon key:
   ```
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   ```
4. Deploy the review edge function and give it an Anthropic API key (it runs server-side, so the key never reaches the browser):
   ```
   supabase functions deploy evaluate-expense
   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
   ```
5. `npm run dev`

`supabase/seed.sql` has sample data matching the original wireframes, for local development.

## Project structure

- `src/pages/` — route-level screens (`Dashboard`, `SubmitExpense`, `Approvals`, `Login`, `Signup`)
- `src/components/` — shared UI pieces (nav, stat cards, category progress bars, status tags, expense table, `ProtectedRoute`)
- `src/lib/` — Supabase client, auth helpers, and data-access functions
- `src/styles/organic.css` — the design system's tokens and component classes
- `src/styles/app.css` — page-level layout classes built on top of the design system
- `supabase/migrations/` — schema, in order
- `supabase/functions/evaluate-expense/` — the agentic review step (see below)

## Notes

- **Approvals is behind Supabase Auth.** The Dashboard and Submit expense pages stay open to anyone (matching the original wireframes), but `/approvals` is wrapped in `ProtectedRoute` (`src/components/ProtectedRoute.tsx`) and redirects signed-out visitors to `/login`. Auth uses `supabase-js`'s built-in email/password Auth — sign up at `/signup`, log in at `/login`, log out via the nav bar — with the session persisted automatically by `supabase-js` (localStorage), no server or middleware involved since this is a client-only Vite SPA. See `src/lib/auth.ts`.
- **Approve/deny is tied to the logged-in user, at the database level too.** The Approvals page (`src/pages/Approvals.tsx`) lists expenses by status (Pending / Needs board / Approved / Rejected) and opens a review dialog (`src/components/ReviewDialog.tsx`) to act on one. Approving or denying stamps `expenses.reviewed_by` and `reviewed_at` with the signed-in user; denying also requires a short reason, stored in `denial_reason`. The `expenses` table's RLS update policy only grants `UPDATE` to `authenticated` (see `supabase/migrations/20260813010000_add_expense_review_fields.sql`), so approve/deny fails at the database if someone isn't logged in — the frontend route guard isn't the only thing enforcing it.
- **Expense review is agentic, not a fixed rule.** Every submission goes through the `evaluate-expense` edge function, which asks Claude to decide whether the item/service looks unusual for the club, and combines that with the amount to land on one of three outcomes: expenses under $50 that aren't flagged are auto-`approved`; expenses $50 and up that aren't flagged go to `pending` for normal treasurer sign-off; anything flagged as unusual — regardless of amount — or over $300 goes to `needs_board`, even if it's small. Claude's one-sentence rationale is stored on `expenses.review_reason` and shown as a tooltip on the status tag. If the model call fails for any reason, the function fails safe and routes to `needs_board` rather than silently auto-approving.
