import { useState } from 'react';
import { useApp, t } from '@/contexts/AppContext';
import homeHero from '@/assets/home-hero.png';

const HeroSection = () => {
  const { language } = useApp();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  return (
    <div className="relative mx-4 mt-4 rounded-2xl overflow-hidden shadow-buna">
      {/* Fallback gradient background - always visible */}
      <div 
        className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-buna-brown"
        style={{ 
          background: 'linear-gradient(135deg, hsl(100, 50%, 40%) 0%, hsl(100, 45%, 35%) 50%, hsl(30, 50%, 30%) 100%)' 
        }}
      />
      
      {/* Hero image - overlays gradient when loaded */}
      {!imageError && (
        <img 
          src={homeHero} 
          alt="Buna Chat Hero" 
          className={`relative w-full h-48 object-cover object-top transition-opacity duration-300 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
        />
      )}
      
      {/* Gradient overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
      
      {/* Content */}
      <div className="absolute bottom-4 left-4 text-white z-10">
        <h2 className="text-2xl font-bold drop-shadow-lg">{t('nuBunaTetu', language)} ☕️</h2>
        <p className="text-white/90 drop-shadow-md">{t('comeDrinkCoffee', language)}</p>
        <p className="text-white/80 text-sm drop-shadow-md">{t('goodMorning', language)}</p>
      </div>
      
      {/* Decorative coffee beans when image fails */}
      {imageError && (
        <div className="relative h-48 flex items-center justify-center">
          <div className="text-6xl opacity-30">☕️</div>
        </div>
      )}
    </div>
  );
};

export default HeroSection;
