# St. Croix Valley Bird Club — Expenses

A member-facing expense submission and dashboard app for the club. React + TypeScript + Vite frontend, Supabase (Postgres) backend.

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

- `src/pages/` — route-level screens (`Dashboard`, `SubmitExpense`, `Approvals`)
- `src/components/` — shared UI pieces (nav, stat cards, category progress bars, status tags, expense table)
- `src/lib/` — Supabase client and data-access functions
- `src/styles/organic.css` — the design system's tokens and component classes
- `src/styles/app.css` — page-level layout classes built on top of the design system
- `supabase/migrations/` — schema, in order
- `supabase/functions/evaluate-expense/` — the agentic review step (see below)

## Notes

- The `Approvals` page is a placeholder — the treasurer/board approval queue was designed separately and wasn't part of the wireframe handoff.
- **Expense review is agentic, not a fixed rule.** Every submission goes through the `evaluate-expense` edge function, which asks Claude to decide `pending` vs. `needs_board` based on the amount (generally >$300) *and* whether the item/service looks unusual for the club — not a hardcoded cutoff. Claude's one-sentence rationale is stored on `expenses.review_reason` and shown as a tooltip on the status tag. If the model call fails for any reason, the function fails safe and routes to `needs_board` rather than silently auto-approving.
