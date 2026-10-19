-- Caches the AI synthesis result per concern.
-- Keyed by concern_id + answer_count so the cache auto-invalidates
-- when new answers arrive (different count = stale).
CREATE TABLE IF NOT EXISTS public.concern_synthesis_cache (
  concern_id   uuid PRIMARY KEY REFERENCES public.concerns(id) ON DELETE CASCADE,
  answer_count integer NOT NULL,
  cache        jsonb   NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.concern_synthesis_cache ENABLE ROW LEVEL SECURITY;

-- Anyone can read (result page is public)
CREATE POLICY "synthesis_cache_select_all" ON public.concern_synthesis_cache
  FOR SELECT USING (true);

-- Only service role can insert/update (done server-side via admin client)
CREATE POLICY "synthesis_cache_insert_service" ON public.concern_synthesis_cache
  FOR INSERT WITH CHECK (true);

CREATE POLICY "synthesis_cache_update_service" ON public.concern_synthesis_cache
  FOR UPDATE USING (true);
