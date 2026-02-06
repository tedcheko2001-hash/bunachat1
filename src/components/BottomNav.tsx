import { Home, MessageCircle, Coffee, Newspaper, Briefcase, User } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp, t } from '@/contexts/AppContext';

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useApp();

  const navItems = [
    { icon: Home, label: t('home', language), path: '/home' },
    { icon: Coffee, label: t('bunaRooms', language), path: '/rooms' },
    { icon: Newspaper, label: t('news', language), path: '/news' },
    { icon: Briefcase, label: t('opportunities', language), path: '/opportunities' },
    { icon: User, label: t('profile', language), path: '/profile' },
  ];

  return (
    <nav className="bottom-nav">
      {navItems.map(({ icon: Icon, label, path }) => (
        <button
          key={path}
          onClick={() => navigate(path)}
          className={`nav-item ${location.pathname === path ? 'active' : ''}`}
        >
          <Icon size={22} />
          <span className="text-xs font-medium">{label}</span>
        </button>
      ))}
    </nav>
  );
};

export default BottomNav;
