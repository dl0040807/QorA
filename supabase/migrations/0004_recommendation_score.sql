-- Store the match score on each recommendation, to show it on the right side of the result screen.
alter table recommendations add column score int;
