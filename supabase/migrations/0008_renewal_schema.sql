-- concerns: posted by askers (anonymous session)
CREATE TABLE IF NOT EXISTS public.concerns (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content         text NOT NULL,
  category        text,
  status          text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  asker_session_id uuid NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.concerns ENABLE ROW LEVEL SECURITY;

-- Anyone can read concerns (answerers need to see them)
CREATE POLICY "concerns_select_all" ON public.concerns
  FOR SELECT USING (true);

-- Only the asker can insert their own concern
CREATE POLICY "concerns_insert_own" ON public.concerns
  FOR INSERT WITH CHECK (asker_session_id = auth.uid());

-- Only the asker can update their own concern
CREATE POLICY "concerns_update_own" ON public.concerns
  FOR UPDATE USING (asker_session_id = auth.uid());

-- answers: submitted by anonymous answerers (no session required)
CREATE TABLE IF NOT EXISTS public.answers (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  concern_id              uuid NOT NULL REFERENCES public.concerns(id) ON DELETE CASCADE,
  answer_text             text NOT NULL,
  answerer_light_profile  jsonb NOT NULL DEFAULT '{}',
  answerer_session_id     uuid,
  created_at              timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;

-- Anyone can read answers (needed for synthesis display)
CREATE POLICY "answers_select_all" ON public.answers
  FOR SELECT USING (true);

-- Anyone can insert an answer (anonymous answerers have no session)
CREATE POLICY "answers_insert_all" ON public.answers
  FOR INSERT WITH CHECK (true);
