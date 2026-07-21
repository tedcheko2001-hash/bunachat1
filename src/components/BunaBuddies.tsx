import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';
import { MapPin, Loader2, Navigation, Coffee } from 'lucide-react';
import VerifiedBadge from '@/components/VerifiedBadge';
import { toast } from 'sonner';

interface Buddy {
  user_id: string;
  name: string | null;
  avatar_url: string | null;
  is_verified: boolean | null;
  distance_km: number;
}

const BunaBuddies = () => {
  const { user } = useApp();
  const navigate = useNavigate();
  const [buddies, setBuddies] = useState<Buddy[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLocation, setHasLocation] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if user already has a location saved
    (async () => {
      if (!user) return;
      const { data } = await supabase
        .from('user_locations' as any)
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) {
        setHasLocation(true);
        void fetchBuddies();
      } else {
        setHasLocation(false);
      }
    })();
  }, [user?.id]);

  const fetchBuddies = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any).rpc('nearby_buddies', { radius_km: 50 });
    if (!error && data) setBuddies(data as Buddy[]);
    setLoading(false);
  };

  const shareLocation = () => {
    if (!user) return;
    if (!('geolocation' in navigator)) {
      toast.error('Geolocation is not supported on this device');
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const { error } = await (supabase as any)
          .from('user_locations')
          .upsert({
            user_id: user.id,
            latitude,
            longitude,
            accuracy,
            updated_at: new Date().toISOString(),
          });
        if (error) {
          toast.error('Failed to save location');
          setLoading(false);
          return;
        }
        setHasLocation(true);
        toast.success('Location shared. Finding buddies near you...');
        await fetchBuddies();
      },
      (err) => {
        console.error(err);
        toast.error('Could not access your location. Enable permissions and try again.');
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  return (
    <div className="mx-4 mt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold flex items-center gap-2">
          <MapPin size={18} className="text-primary" />
          Buna Buddies
        </h3>
        {hasLocation && (
          <button
            onClick={shareLocation}
            className="text-xs text-primary flex items-center gap-1 hover:underline"
          >
            <Navigation size={12} /> Refresh
          </button>
        )}
      </div>

      {hasLocation === false && (
        <button
          onClick={shareLocation}
          disabled={loading}
          className="w-full buna-card p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            {loading ? <Loader2 className="animate-spin text-primary" size={20} /> : <MapPin size={20} className="text-primary" />}
          </div>
          <div className="text-left">
            <p className="font-medium text-sm">Find people near you</p>
            <p className="text-xs text-muted-foreground">Share your location to discover nearby Buna buddies</p>
          </div>
        </button>
      )}

      {hasLocation && loading && (
        <div className="buna-card p-6 flex items-center justify-center">
          <Loader2 className="animate-spin text-primary" size={24} />
        </div>
      )}

      {hasLocation && !loading && buddies.length === 0 && (
        <div className="buna-card p-4 text-center text-sm text-muted-foreground">
          No buddies found nearby yet. Check back soon!
        </div>
      )}

      {hasLocation && buddies.length > 0 && (
        <div className="space-y-2">
          {buddies.map((b) => (
            <button
              key={b.user_id}
              onClick={() => navigate(`/u/${b.user_id}`)}
              className="w-full buna-card p-3 flex items-center gap-3 hover:bg-muted/50 transition-colors"
            >
              <div className="w-11 h-11 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden shrink-0">
                {b.avatar_url ? (
                  <img src={b.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-primary font-bold">{b.name?.charAt(0) || 'U'}</span>
                )}
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="font-medium text-sm truncate">{b.name || 'User'}</p>
                  {b.is_verified && <VerifiedBadge size={12} />}
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin size={10} />
                  {b.distance_km < 1
                    ? `${Math.round(b.distance_km * 1000)} m away`
                    : `${b.distance_km.toFixed(1)} km away`}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default BunaBuddies;
