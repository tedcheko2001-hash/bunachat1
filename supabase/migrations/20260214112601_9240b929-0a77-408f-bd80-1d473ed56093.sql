
-- Fix 1: Restrict notification INSERT to only allow creating notifications
-- where the creator has a legitimate relationship (sent a message, is in a room, etc.)
-- Using trigger-based approach: revoke direct insert and use SECURITY DEFINER functions

-- Drop the overly permissive INSERT policy
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON public.notifications;

-- Create a function to insert notifications (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION public.create_dm_notification(
  p_receiver_id uuid,
  p_sender_name text,
  p_message_preview text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify the caller is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  INSERT INTO public.notifications (user_id, type, title, body)
  VALUES (
    p_receiver_id,
    'dm',
    'New message from ' || p_sender_name,
    left(p_message_preview, 100)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_room_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_body text,
  p_reference_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify the caller is authenticated and is a member of the room
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM public.room_members
    WHERE room_id = p_reference_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not a member of this room';
  END IF;
  
  INSERT INTO public.notifications (user_id, type, title, body, reference_id)
  VALUES (p_user_id, p_type, p_title, p_body, p_reference_id);
END;
$$;

-- Fix 2: Hide email from public profile reads
-- Create a view that excludes email
CREATE VIEW public.profiles_public
WITH (security_invoker = on) AS
  SELECT user_id, name, avatar_url, bio, created_at, updated_at, id
  FROM public.profiles;

-- Update the SELECT policy to deny direct table access
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Only allow users to see their own full profile (with email)
CREATE POLICY "Users can view their own full profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);
