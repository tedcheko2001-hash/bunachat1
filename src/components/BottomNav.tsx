import { useState, useEffect } from 'react';
import { Home, MessageCircle, Coffee, Newspaper, Briefcase, User } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp, t } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { language, user } = useApp();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      fetchUnreadCount();

      const channel = supabase
        .channel('notifications-badge')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
          fetchUnreadCount();
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [user]);

  const fetchUnreadCount = async () => {
    if (!user) return;
    const { count } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
    setUnreadCount(count || 0);
  };

  const navItems = [
    { icon: Home, label: t('home', language), path: '/home' },
    { icon: MessageCircle, label: t('chat', language), path: '/conversations', badge: unreadCount },
    { icon: Coffee, label: t('bunaRooms', language), path: '/rooms' },
    { icon: Newspaper, label: t('news', language), path: '/news' },
    { icon: User, label: t('profile', language), path: '/profile' },
  ];

  return (
    <nav className="bottom-nav">
      {navItems.map(({ icon: Icon, label, path, badge }) => (
        <button
          key={path}
          onClick={() => navigate(path)}
          className={`nav-item relative ${location.pathname === path || (path === '/conversations' && location.pathname.startsWith('/dm')) ? 'active' : ''}`}
        >
          <div className="relative">
            <Icon size={22} />
            {badge && badge > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                {badge > 99 ? '99+' : badge}
              </span>
            )}
          </div>
          <span className="text-xs font-medium">{label}</span>
        </button>
      ))}
    </nav>
  );
};

export default BottomNav;
