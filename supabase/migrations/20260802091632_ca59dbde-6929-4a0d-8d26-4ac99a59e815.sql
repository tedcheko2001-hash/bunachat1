CREATE TABLE public.call_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  caller_id uuid NOT NULL,
  callee_id uuid NOT NULL,
  video boolean NOT NULL DEFAULT false,
  duration_seconds integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'answered',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.call_history TO authenticated;
GRANT ALL ON public.call_history TO service_role;

ALTER TABLE public.call_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view their calls"
ON public.call_history FOR SELECT TO authenticated
USING (auth.uid() = caller_id OR auth.uid() = callee_id);

CREATE POLICY "Participants can log their calls"
ON public.call_history FOR INSERT TO authenticated
WITH CHECK (auth.uid() = caller_id OR auth.uid() = callee_id);

CREATE INDEX idx_call_history_caller ON public.call_history (caller_id, created_at DESC);
CREATE INDEX idx_call_history_callee ON public.call_history (callee_id, created_at DESC);