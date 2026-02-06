import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import loadingBg from '@/assets/loading-bg.png';

const LoadingPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/auth');
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{
        backgroundImage: `url(${loadingBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-buna-cream/30" />
      
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
              stroke="hsl(0 0% 70%)" 
              strokeWidth="3" 
              strokeLinecap="round"
              className="steam-animation"
              opacity="0.6"
            />
            <path 
              d="M40 10 Q45 20 40 30 Q35 40 40 50" 
              stroke="hsl(0 0% 75%)" 
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

        {/* From TED text */}
        <div className="text-lg font-medium text-foreground/80">
          from <span className="text-buna-red font-bold">TED</span>
        </div>
      </div>

      {/* Bottom wave decoration */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 200" className="w-full">
          <path 
            d="M0,160 Q360,120 720,160 T1440,160 L1440,200 L0,200 Z" 
            fill="hsl(100, 50%, 45%)"
          />
          <path 
            d="M0,170 Q360,130 720,170 T1440,170 L1440,200 L0,200 Z" 
            fill="hsl(45, 80%, 50%)"
          />
          <path 
            d="M0,180 Q360,140 720,180 T1440,180 L1440,200 L0,200 Z" 
            fill="hsl(0, 75%, 50%)"
          />
        </svg>
      </div>

      {/* Decorative leaves */}
      <div className="absolute bottom-16 left-4">
        <svg viewBox="0 0 60 80" className="w-16 h-20 opacity-80">
          <path 
            d="M30 80 Q10 60 15 30 Q20 10 35 5 Q50 10 45 30 Q50 60 30 80" 
            fill="hsl(120, 50%, 40%)"
          />
          <path 
            d="M30 75 L30 20" 
            stroke="hsl(120, 40%, 30%)" 
            strokeWidth="2"
          />
        </svg>
      </div>
    </div>
  );
};

export default LoadingPage;
