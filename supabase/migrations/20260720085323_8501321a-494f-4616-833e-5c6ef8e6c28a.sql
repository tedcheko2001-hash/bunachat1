
CREATE TYPE public.friendship_status AS ENUM ('pending', 'accepted');

CREATE TABLE public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.friendship_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT no_self_friend CHECK (requester_id <> addressee_id),
  CONSTRAINT unique_pair UNIQUE (requester_id, addressee_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.friendships TO authenticated;
GRANT ALL ON public.friendships TO service_role;

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their friendships"
  ON public.friendships FOR SELECT TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE POLICY "Users send friend requests"
  ON public.friendships FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = requester_id AND status = 'pending');

CREATE POLICY "Addressee updates status"
  ON public.friendships FOR UPDATE TO authenticated
  USING (auth.uid() = addressee_id)
  WITH CHECK (auth.uid() = addressee_id);

CREATE POLICY "Either party removes"
  ON public.friendships FOR DELETE TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE TRIGGER update_friendships_updated_at
  BEFORE UPDATE ON public.friendships
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_friendships_requester ON public.friendships(requester_id);
CREATE INDEX idx_friendships_addressee ON public.friendships(addressee_id);

-- Suggestions: users who registered recently, excluding self and existing connections
CREATE OR REPLACE FUNCTION public.friend_suggestions(_limit int DEFAULT 20)
RETURNS TABLE(user_id uuid, name text, avatar_url text, is_verified boolean, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.user_id, p.name, p.avatar_url, p.is_verified, p.created_at
  FROM public.profiles p
  WHERE p.user_id <> auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM public.friendships f
      WHERE (f.requester_id = auth.uid() AND f.addressee_id = p.user_id)
         OR (f.addressee_id = auth.uid() AND f.requester_id = p.user_id)
    )
  ORDER BY p.created_at DESC
  LIMIT _limit;
$$;
