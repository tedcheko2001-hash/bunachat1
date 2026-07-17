
-- =========================================================
-- 1. Role-based access control (replace hardcoded admin email)
-- =========================================================
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- Seed initial admin (idempotent). Safe if the auth user does not yet exist.
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE email = 'tedydeme97@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- =========================================================
-- 2. user_visits: drop sensitive columns + role-based access
-- =========================================================
ALTER TABLE public.user_visits DROP COLUMN IF EXISTS ip_address;
ALTER TABLE public.user_visits DROP COLUMN IF EXISTS email;

DROP POLICY IF EXISTS "Admin can view all visits" ON public.user_visits;
CREATE POLICY "Admins can view all visits"
  ON public.user_visits FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- 3. Conversations: allow either participant to delete
-- =========================================================
DROP POLICY IF EXISTS "Users can delete their conversations" ON public.conversations;
CREATE POLICY "Users can delete their conversations"
  ON public.conversations FOR DELETE
  TO authenticated
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- =========================================================
-- 4. Room membership: restrict SELECT to members + owners
-- =========================================================
CREATE OR REPLACE FUNCTION public.is_room_member(_room uuid, _user uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.room_members
    WHERE room_id = _room AND user_id = _user
  );
$$;

DROP POLICY IF EXISTS "Room members are viewable by everyone" ON public.room_members;
DROP POLICY IF EXISTS "Members can view fellow members" ON public.room_members;
CREATE POLICY "Members can view fellow members"
  ON public.room_members FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_room_member(room_id, auth.uid()));

-- Public helper: only exposes aggregate counts, never user identities
CREATE OR REPLACE FUNCTION public.room_member_counts()
RETURNS TABLE(room_id uuid, member_count integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT room_id, COUNT(*)::int AS member_count
  FROM public.room_members
  GROUP BY room_id;
$$;
GRANT EXECUTE ON FUNCTION public.room_member_counts() TO authenticated, anon;

-- =========================================================
-- 5. Buna rooms: hide creator identity via column privileges
--    Public users can still see id/name/image/created_at.
--    Room admin is fetched through a security-definer helper
--    that only returns for members.
-- =========================================================
REVOKE SELECT ON public.buna_rooms FROM anon;
REVOKE SELECT ON public.buna_rooms FROM authenticated;
GRANT SELECT (id, name, image_url, created_at) ON public.buna_rooms TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.get_room_admin(_room uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT created_by FROM public.buna_rooms
  WHERE id = _room
    AND public.is_room_member(_room, auth.uid());
$$;
GRANT EXECUTE ON FUNCTION public.get_room_admin(uuid) TO authenticated;
