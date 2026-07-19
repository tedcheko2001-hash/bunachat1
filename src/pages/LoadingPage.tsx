import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import loadingSplashAsset from '@/assets/loading-splash-v4.png.asset.json';
import { supabase } from '@/integrations/supabase/client';

const LoadingPage = () => {
  const navigate = useNavigate();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    const logVisit = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await supabase.from('user_visits').insert({
          user_id: session.user.id,
          user_agent: navigator.userAgent,
        });
      }
      return session;
    };

    let cancelled = false;
    (async () => {
      const session = await logVisit();
      if (cancelled) return;
      // Wait a moment for the splash to be enjoyed, then fade out and route
      setTimeout(() => setFadingOut(true), 2200);
      setTimeout(() => {
        if (cancelled) return;
        navigate(session?.user ? '/home' : '/auth', { replace: true });
      }, 2700);
    })();

    return () => { cancelled = true; };
  }, [navigate]);

  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-center relative overflow-hidden transition-opacity duration-500 ${
        fadingOut ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ background: 'hsl(60, 10%, 96%)' }}
    >
      {/* Splash image */}
      <img
        src={loadingSplashAsset.url}
        alt="Buna Chat splash"
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
          imageLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        onLoad={() => setImageLoaded(true)}
        loading="eager"
        decoding="async"
        fetchPriority="high"
      />

      {/* Animated loading dots — positioned to align with the baked-in dots below the jebena */}
      <div
        className={`absolute left-1/2 -translate-x-1/2 flex gap-3 z-10 transition-opacity duration-500 ${
          imageLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ top: '58%' }}
        aria-label="Loading"
        role="status"
      >
        <span className="loading-dot loading-dot-green" />
        <span className="loading-dot loading-dot-yellow" />
        <span className="loading-dot loading-dot-red" />
      </div>
    </div>
  );
};

export default LoadingPage;
