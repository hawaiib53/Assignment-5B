-- The agentic review step (evaluate-expense edge function) records why it
-- routed an expense to pending vs. needs_board, for the board to read.

alter table expenses add column review_reason text;
