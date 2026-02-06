import { useNavigate } from 'react-router-dom';
import { useApp, t } from '@/contexts/AppContext';
import BottomNav from '@/components/BottomNav';
import { ArrowLeft, Moon, Globe, Bell, Shield, Info, ChevronRight } from 'lucide-react';

const SettingsPage = () => {
  const navigate = useNavigate();
  const { language, darkMode, setDarkMode, setLanguage } = useApp();

  return (
    <div className="page-container bg-background">
      {/* Header */}
      <header className="buna-header px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2">
          <ArrowLeft size={24} />
        </button>
        <h1 className="font-semibold text-lg">{t('settings', language)}</h1>
      </header>

      <div className="p-4 space-y-6">
        {/* Appearance */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-2 px-1">Appearance</h3>
          <div className="buna-card overflow-hidden">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Moon size={20} className="text-muted-foreground" />
                <span className="font-medium">{t('darkMode', language)}</span>
              </div>
              <div className={`w-12 h-6 rounded-full transition-colors ${darkMode ? 'bg-primary' : 'bg-muted'}`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${darkMode ? 'translate-x-6' : 'translate-x-0.5'} mt-0.5`} />
              </div>
            </button>
          </div>
        </div>

        {/* Language */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-2 px-1">{t('language', language)}</h3>
          <div className="buna-card overflow-hidden">
            <button
              onClick={() => setLanguage('en')}
              className={`w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors ${language === 'en' ? 'bg-primary/5' : ''}`}
            >
              <div className="flex items-center gap-3">
                <Globe size={20} className="text-muted-foreground" />
                <span className="font-medium">English</span>
              </div>
              {language === 'en' && (
                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full" />
                </div>
              )}
            </button>
            
            <button
              onClick={() => setLanguage('am')}
              className={`w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors border-t border-border ${language === 'am' ? 'bg-primary/5' : ''}`}
            >
              <div className="flex items-center gap-3">
                <Globe size={20} className="text-muted-foreground" />
                <span className="font-medium">አማርኛ (Amharic)</span>
              </div>
              {language === 'am' && (
                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full" />
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Other Settings */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-2 px-1">Other</h3>
          <div className="buna-card overflow-hidden">
            <button
              onClick={() => navigate('/notifications')}
              className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Bell size={20} className="text-muted-foreground" />
                <span className="font-medium">Notifications</span>
              </div>
              <ChevronRight size={20} className="text-muted-foreground" />
            </button>
            
            <button
              onClick={() => navigate('/privacy')}
              className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors border-t border-border"
            >
              <div className="flex items-center gap-3">
                <Shield size={20} className="text-muted-foreground" />
                <span className="font-medium">Privacy</span>
              </div>
              <ChevronRight size={20} className="text-muted-foreground" />
            </button>
            
            <button
              className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors border-t border-border"
            >
              <div className="flex items-center gap-3">
                <Info size={20} className="text-muted-foreground" />
                <span className="font-medium">About Buna Chat</span>
              </div>
              <span className="text-sm text-muted-foreground">v1.0.0</span>
            </button>
          </div>
        </div>

        <p className="text-center text-sm text-muted-foreground pt-4">
          from <span className="text-buna-red font-bold">TED</span>
        </p>
      </div>

      <BottomNav />
    </div>
  );
};

export default SettingsPage;
