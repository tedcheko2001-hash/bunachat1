-- 1. user_locations: owner-only reads
DROP POLICY IF EXISTS "Authenticated users can view locations" ON public.user_locations;
CREATE POLICY "Users can view their own location"
ON public.user_locations FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- 2. avatars bucket: folder ownership checks
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 3. public buckets: remove broad listing policies (public URLs still work via CDN)
DROP POLICY IF EXISTS "Avatars are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Posts images are publicly accessible" ON storage.objects;

-- 4. lock down SECURITY DEFINER / internal functions from API roles
REVOKE ALL ON FUNCTION public.apply_verification_decision() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_comment_edited() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_dm_notification(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_room_notification(uuid, text, text, text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.friend_suggestions(integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.nearby_buddies(double precision) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.room_member_counts() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_room_admin(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_room_member(uuid, uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_dm_notification(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_room_notification(uuid, text, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.friend_suggestions(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.nearby_buddies(double precision) TO authenticated;
GRANT EXECUTE ON FUNCTION public.room_member_counts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_room_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_room_member(uuid, uuid) TO authenticated;