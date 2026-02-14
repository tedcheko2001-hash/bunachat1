
-- Table to track user visits/logins
CREATE TABLE public.user_visits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  visited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT
);

-- Enable RLS
ALTER TABLE public.user_visits ENABLE ROW LEVEL SECURITY;

-- Only the linked admin email can view all visits
CREATE POLICY "Admin can view all visits"
  ON public.user_visits FOR SELECT
  USING (auth.jwt() ->> 'email' = 'tedydeme97@gmail.com');

-- Any authenticated user can insert their own visit
CREATE POLICY "Users can log their own visit"
  ON public.user_visits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_visits;
