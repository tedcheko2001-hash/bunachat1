import { Bell, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import bunaChatLogoAsset from '@/assets/bunachat-logo.jpg.asset.json';

interface HeaderProps {
  showNotifications?: boolean;
  showSettings?: boolean;
}

const Header = ({ showNotifications = true, showSettings = false }: HeaderProps) => {
  const navigate = useNavigate();

  return (
    <header className="buna-header px-4 py-3 flex items-center justify-between rounded-b-3xl">
      <div className="flex items-center gap-2">
        <img src={bunaChatLogoAsset.url} alt="Buna Chat" className="w-10 h-10 rounded-xl" />
        <span className="font-script text-2xl">Buna chat</span>
      </div>
      
      <div className="flex items-center gap-2">
        {showNotifications && (
          <>
            <button 
              onClick={() => navigate('/notifications')}
              className="p-2 rounded-full hover:bg-primary-foreground/10 transition-colors"
            >
              <Bell size={22} />
            </button>
            <button 
              onClick={() => navigate('/chat')}
              className="p-2 rounded-full hover:bg-primary-foreground/10 transition-colors"
            >
              <Users size={22} />
            </button>
          </>
        )}
        {showSettings && (
          <button 
            onClick={() => navigate('/settings')}
            className="p-2 rounded-full hover:bg-primary-foreground/10 transition-colors"
          >
            <Settings size={22} />
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;
