import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import loadingSplash from '@/assets/loading-splash.png';
import { supabase } from '@/integrations/supabase/client';

const LoadingPage = () => {
  const navigate = useNavigate();
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    // Log user visit
    const logVisit = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await supabase.from('user_visits').insert({
          user_id: session.user.id,
          email: session.user.email || null,
          user_agent: navigator.userAgent,
        });
      }
    };
    logVisit();

    const timer = setTimeout(() => {
      navigate('/auth');
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      {/* Fallback solid background */}
      <div 
        className="absolute inset-0"
        style={{ background: 'hsl(60, 10%, 96%)' }}
      />
      
      {/* Background image - the uploaded splash */}
      <img 
        src={loadingSplash}
        alt=""
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
          imageLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        onLoad={() => setImageLoaded(true)}
      />

      {/* Fallback content while image loads */}
      {!imageLoaded && (
        <div className="relative z-10 flex flex-col items-center">
          {/* Jebena silhouette */}
          <div className="relative mb-6">
            <svg viewBox="0 0 120 140" className="w-28 h-36" fill="none">
              {/* Steam */}
              <path d="M65 8 Q70 18 65 28 Q60 38 65 48" stroke="hsl(0 0% 70%)" strokeWidth="3" strokeLinecap="round" className="steam-animation" opacity="0.5"/>
              <path d="M55 12 Q60 22 55 32 Q50 42 55 52" stroke="hsl(0 0% 75%)" strokeWidth="2" strokeLinecap="round" className="steam-animation" style={{ animationDelay: '0.5s' }} opacity="0.35"/>
              {/* Jebena body - tilted */}
              <g transform="rotate(-25 60 90)">
                <ellipse cx="60" cy="110" rx="22" ry="9" fill="hsl(30 30% 12%)"/>
                <path d="M38 110 Q34 90 42 72 L78 72 Q86 90 82 110" fill="hsl(30 25% 10%)"/>
                <path d="M42 72 Q60 68 78 72 L74 62 Q60 60 46 62 Z" fill="hsl(30 25% 10%)"/>
                <path d="M74 67 Q88 58 92 48 L95 51 Q90 60 76 70" fill="hsl(30 25% 10%)"/>
                <ellipse cx="38" cy="88" rx="7" ry="13" fill="none" stroke="hsl(30 25% 10%)" strokeWidth="4"/>
              </g>
            </svg>
          </div>

          {/* Three colored dots */}
          <div className="flex gap-3 mb-6">
            <div className="w-3 h-3 rounded-full" style={{ background: 'hsl(140, 70%, 35%)' }}></div>
            <div className="w-3 h-3 rounded-full" style={{ background: 'hsl(45, 90%, 55%)' }}></div>
            <div className="w-3 h-3 rounded-full" style={{ background: 'hsl(0, 75%, 50%)' }}></div>
          </div>
        </div>
      )}

      {/* Branding footer overlay — covers baked-in text on splash image */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center z-20">
        <div className="px-5 py-2 rounded-full bg-white/90 backdrop-blur-sm shadow-sm">
          <span className="text-sm">
            from <span className="brand-gradient-text">Teds Online Company</span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default LoadingPage;
