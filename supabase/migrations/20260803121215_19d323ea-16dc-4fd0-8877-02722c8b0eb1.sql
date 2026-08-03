ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text;

UPDATE public.profiles p
SET username = sub.uname
FROM (
  SELECT id,
         CASE WHEN rn = 1 THEN base ELSE base || rn::text END AS uname
  FROM (
    SELECT id,
           COALESCE(NULLIF(regexp_replace(lower(name), '[^a-z0-9_]', '', 'g'), ''), 'buna') AS base,
           ROW_NUMBER() OVER (
             PARTITION BY COALESCE(NULLIF(regexp_replace(lower(name), '[^a-z0-9_]', '', 'g'), ''), 'buna')
             ORDER BY created_at
           ) AS rn
    FROM public.profiles
  ) x
) sub
WHERE p.id = sub.id AND p.username IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_key ON public.profiles (lower(username));

DROP VIEW IF EXISTS public.profiles_public;
CREATE VIEW public.profiles_public
WITH (security_invoker = on) AS
SELECT id, user_id, name, username, avatar_url, bio, is_verified, created_at, updated_at
FROM public.profiles;

DROP FUNCTION IF EXISTS public.friend_suggestions(integer);
CREATE FUNCTION public.friend_suggestions(_limit integer DEFAULT 20)
RETURNS TABLE(user_id uuid, name text, username text, avatar_url text, is_verified boolean, created_at timestamp with time zone)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT p.user_id, p.name, p.username, p.avatar_url, p.is_verified, p.created_at
  FROM public.profiles p
  WHERE p.user_id <> auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM public.friendships f
      WHERE (f.requester_id = auth.uid() AND f.addressee_id = p.user_id)
         OR (f.addressee_id = auth.uid() AND f.requester_id = p.user_id)
    )
  ORDER BY p.created_at DESC
  LIMIT _limit;
$function$;

REVOKE EXECUTE ON FUNCTION public.friend_suggestions(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.friend_suggestions(integer) TO authenticated;