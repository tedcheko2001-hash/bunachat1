-- 1) Recreate profiles_public as a SECURITY INVOKER view (no definer bypass)
DROP VIEW IF EXISTS public.profiles_public;
CREATE VIEW public.profiles_public
WITH (security_invoker = on) AS
SELECT id, user_id, name, username, avatar_url, bio, is_verified, created_at, updated_at
FROM public.profiles;

GRANT SELECT ON public.profiles_public TO authenticated;
GRANT SELECT ON public.profiles_public TO anon;

-- 2) Lock down the email column: replace table-level SELECT with column-level grants
REVOKE SELECT ON public.profiles FROM authenticated;
REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (id, user_id, name, username, avatar_url, bio, is_verified, created_at, updated_at) ON public.profiles TO authenticated;

-- Row-level policy so signed-in users can read non-sensitive profile columns of others
DROP POLICY IF EXISTS "Authenticated users can view public profile data" ON public.profiles;
CREATE POLICY "Authenticated users can view public profile data"
ON public.profiles FOR SELECT TO authenticated
USING (true);

-- 3) Stories bucket: read media only per story visibility rules
DROP POLICY IF EXISTS "Authenticated users can read stories" ON storage.objects;
CREATE POLICY "Story media readable per story visibility"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'stories'
  AND (
    (storage.foldername(name))[1] = (auth.uid())::text
    OR EXISTS (
      SELECT 1 FROM public.stories s
      WHERE s.media_url LIKE '%' || name || '%'
        AND s.expires_at > now()
        AND (
          s.visibility = 'public'
          OR s.user_id = auth.uid()
          OR (
            s.visibility = 'friends'
            AND EXISTS (
              SELECT 1 FROM public.follows f
              WHERE f.follower_id = auth.uid()
                AND f.following_id = s.user_id
            )
          )
        )
    )
  )
);

-- 4) SECURITY DEFINER functions: not callable by anonymous users
REVOKE EXECUTE ON FUNCTION public.apply_verification_decision() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.create_dm_notification(uuid, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.create_room_notification(uuid, text, text, text, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.friend_suggestions(integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_room_admin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_room_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.nearby_buddies(double precision) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.room_member_counts() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.search_profiles(text, integer) FROM PUBLIC, anon;

-- Ensure signed-in users retain access (required by RLS policies and app RPCs)
GRANT EXECUTE ON FUNCTION public.create_dm_notification(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_room_notification(uuid, text, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.friend_suggestions(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_room_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_room_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.nearby_buddies(double precision) TO authenticated;
GRANT EXECUTE ON FUNCTION public.room_member_counts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_profiles(text, integer) TO authenticated;