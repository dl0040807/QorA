-- Adds resolution support to concerns.
-- resolution_note: the asker's public closing message (written with AI assistance).
-- status 'closed' already exists as a valid CHECK value in 0008.

ALTER TABLE public.concerns
  ADD COLUMN IF NOT EXISTS resolution_note text;
