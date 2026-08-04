-- Indexes for identity-linked lookups
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts (user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments (user_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON public.messages (receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_room ON public.messages (room_id, created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_name_trgm ON public.profiles (lower(name));

-- Read receipts for private messages
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS read_at timestamptz;

-- Allow a receiver to mark a message as read
DROP POLICY IF EXISTS "Receiver can mark message read" ON public.messages;
CREATE POLICY "Receiver can mark message read"
ON public.messages FOR UPDATE TO authenticated
USING (receiver_id = auth.uid())
WITH CHECK (receiver_id = auth.uid());

-- Independent comment count per post
CREATE OR REPLACE FUNCTION public.post_comment_count(_post_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COUNT(*)::int FROM public.comments WHERE post_id = _post_id;
$$;

CREATE OR REPLACE FUNCTION public.post_comment_counts(_post_ids uuid[])
RETURNS TABLE(post_id uuid, comment_count integer)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT c.post_id, COUNT(*)::int
  FROM public.comments c
  WHERE c.post_id = ANY(_post_ids)
  GROUP BY c.post_id;
$$;

REVOKE ALL ON FUNCTION public.post_comment_count(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.post_comment_counts(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.post_comment_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.post_comment_counts(uuid[]) TO authenticated;

-- Indexed profile search
CREATE OR REPLACE FUNCTION public.search_profiles(_q text, _limit integer DEFAULT 20)
RETURNS TABLE(user_id uuid, name text, username text, avatar_url text, is_verified boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.name, p.username, p.avatar_url, p.is_verified
  FROM public.profiles p
  WHERE _q <> ''
    AND (lower(p.name) LIKE lower(_q) || '%' OR lower(p.username) LIKE lower(_q) || '%')
  ORDER BY p.name
  LIMIT LEAST(_limit, 50);
$$;

REVOKE ALL ON FUNCTION public.search_profiles(text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_profiles(text, integer) TO authenticated;