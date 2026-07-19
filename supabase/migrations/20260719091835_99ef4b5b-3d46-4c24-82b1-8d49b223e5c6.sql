-- 1. user_locations table
CREATE TABLE public.user_locations (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_locations TO authenticated;
GRANT ALL ON public.user_locations TO service_role;

ALTER TABLE public.user_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view locations"
  ON public.user_locations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users manage own location insert"
  ON public.user_locations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own location update"
  ON public.user_locations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own location"
  ON public.user_locations FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 2. nearby_buddies function - Haversine formula in km
CREATE OR REPLACE FUNCTION public.nearby_buddies(radius_km DOUBLE PRECISION DEFAULT 25)
RETURNS TABLE (
  user_id UUID,
  name TEXT,
  avatar_url TEXT,
  is_verified BOOLEAN,
  distance_km DOUBLE PRECISION,
  updated_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH me AS (
    SELECT latitude AS lat, longitude AS lng
    FROM public.user_locations
    WHERE user_id = auth.uid()
    LIMIT 1
  )
  SELECT
    ul.user_id,
    p.name,
    p.avatar_url,
    p.is_verified,
    (
      6371 * acos(
        LEAST(1.0, GREATEST(-1.0,
          cos(radians(me.lat)) * cos(radians(ul.latitude)) *
          cos(radians(ul.longitude) - radians(me.lng)) +
          sin(radians(me.lat)) * sin(radians(ul.latitude))
        ))
      )
    ) AS distance_km,
    ul.updated_at
  FROM public.user_locations ul
  CROSS JOIN me
  JOIN public.profiles p ON p.user_id = ul.user_id
  WHERE ul.user_id <> auth.uid()
    AND (
      6371 * acos(
        LEAST(1.0, GREATEST(-1.0,
          cos(radians(me.lat)) * cos(radians(ul.latitude)) *
          cos(radians(ul.longitude) - radians(me.lng)) +
          sin(radians(me.lat)) * sin(radians(ul.latitude))
        ))
      )
    ) <= radius_km
  ORDER BY distance_km ASC
  LIMIT 50;
$$;