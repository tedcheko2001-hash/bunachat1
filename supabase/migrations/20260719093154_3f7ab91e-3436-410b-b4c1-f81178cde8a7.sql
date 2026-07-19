
CREATE TABLE public.ceremonies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.buna_rooms(id) ON DELETE CASCADE,
  host_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  is_live BOOLEAN NOT NULL DEFAULT false,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ceremonies TO authenticated;
GRANT ALL ON public.ceremonies TO service_role;

ALTER TABLE public.ceremonies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Room members can view ceremonies"
ON public.ceremonies FOR SELECT TO authenticated
USING (public.is_room_member(room_id, auth.uid()));

CREATE POLICY "Room members can create ceremonies as host"
ON public.ceremonies FOR INSERT TO authenticated
WITH CHECK (auth.uid() = host_id AND public.is_room_member(room_id, auth.uid()));

CREATE POLICY "Host can update own ceremony"
ON public.ceremonies FOR UPDATE TO authenticated
USING (auth.uid() = host_id) WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Host can delete own ceremony"
ON public.ceremonies FOR DELETE TO authenticated
USING (auth.uid() = host_id);

CREATE TRIGGER update_ceremonies_updated_at
BEFORE UPDATE ON public.ceremonies
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_ceremonies_room ON public.ceremonies(room_id, scheduled_at DESC);


CREATE TABLE public.ceremony_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ceremony_id UUID NOT NULL REFERENCES public.ceremonies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (ceremony_id, user_id)
);

GRANT SELECT, INSERT, DELETE ON public.ceremony_participants TO authenticated;
GRANT ALL ON public.ceremony_participants TO service_role;

ALTER TABLE public.ceremony_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Room members can view participants"
ON public.ceremony_participants FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.ceremonies c
    WHERE c.id = ceremony_id AND public.is_room_member(c.room_id, auth.uid())
  )
);

CREATE POLICY "Room members can join a ceremony"
ON public.ceremony_participants FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM public.ceremonies c
    WHERE c.id = ceremony_id AND public.is_room_member(c.room_id, auth.uid())
  )
);

CREATE POLICY "Users can leave a ceremony"
ON public.ceremony_participants FOR DELETE TO authenticated
USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.ceremonies;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ceremony_participants;
