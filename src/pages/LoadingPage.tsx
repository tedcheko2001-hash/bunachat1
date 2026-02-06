import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import loadingBg from '@/assets/loading-bg.png';

const LoadingPage = () => {
  const navigate = useNavigate();
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
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
        style={{ background: 'hsl(60, 30%, 96%)' }}
      />
      
      {/* Background image */}
      <img 
        src={loadingBg}
        alt=""
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
          imageLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        onLoad={() => setImageLoaded(true)}
      />
      
      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/30" />
      
      {/* Content - only show if image hasn't loaded */}
      {!imageLoaded && (
        <div className="relative z-10 flex flex-col items-center">
          {/* Jebena Icon with steam */}
          <div className="relative mb-8">
            <svg 
              viewBox="0 0 100 120" 
              className="w-32 h-40"
              fill="none"
            >
              {/* Steam */}
              <path 
                d="M50 5 Q55 15 50 25 Q45 35 50 45" 
                stroke="hsl(0 0% 20%)" 
                strokeWidth="3" 
                strokeLinecap="round"
                className="steam-animation"
                opacity="0.6"
              />
              <path 
                d="M40 10 Q45 20 40 30 Q35 40 40 50" 
                stroke="hsl(0 0% 30%)" 
                strokeWidth="2" 
                strokeLinecap="round"
                className="steam-animation"
                style={{ animationDelay: '0.5s' }}
                opacity="0.4"
              />
              
              {/* Jebena body */}
              <ellipse cx="50" cy="100" rx="25" ry="10" fill="hsl(30 40% 20%)" />
              <path 
                d="M25 100 Q20 80 30 60 L70 60 Q80 80 75 100" 
                fill="hsl(30 35% 15%)"
              />
              <path 
                d="M30 60 Q50 55 70 60 L65 50 Q50 48 35 50 Z" 
                fill="hsl(30 35% 15%)"
              />
              {/* Spout */}
              <path 
                d="M65 55 Q80 45 85 35 L88 38 Q82 48 68 58" 
                fill="hsl(30 35% 15%)"
              />
              {/* Handle */}
              <ellipse cx="25" cy="75" rx="8" ry="15" fill="none" stroke="hsl(30 35% 15%)" strokeWidth="5" />
            </svg>
          </div>

          {/* Loading dots */}
          <div className="loading-dots mb-6">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      )}

      {/* From TED text - always visible */}
      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 text-lg font-medium text-foreground/80 z-10">
        from <span className="text-buna-red font-bold">TED</span>
      </div>
    </div>
  );
};

export default LoadingPage;
