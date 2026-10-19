-- H2 revisit/retention: record the outcome of a worry in one tap
alter table worries
  add column outcome text check (outcome in ('helpful', 'unclear', 'regret')),
  add column outcome_recorded_at timestamptz;
