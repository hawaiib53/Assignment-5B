-- Sample data matching the Dashboard wireframe, for local development only.

insert into category_budgets (year, category, budget_amount) values
  (2026, 'speaker_fees', 800),
  (2026, 'event_supplies', 1000),
  (2026, 'donations', 700);

insert into expenses (requester_name, amount, expense_date, items_purchased, justification, status, category) values
  ('Rosa M.', 38, '2026-08-03', '{Feeder seed}', 'Feeder seed for the nature center', 'approved', 'event_supplies'),
  ('Jon K.', 150, '2026-08-01', '{Guest speaker fee}', 'Guest speaker — Aug bird ID talk', 'needs_board', 'speaker_fees'),
  ('Ada L.', 62, '2026-07-28', '{Picnic supplies}', 'Picnic supplies', 'pending', 'event_supplies'),
  ('Mei T.', 24, '2026-07-22', '{Park entry fees}', 'Park entry fees', 'approved', 'event_supplies'),
  ('Board', 210, '2026-07-14', '{Shelter donation}', 'Local shelter donation', 'approved', 'donations');
