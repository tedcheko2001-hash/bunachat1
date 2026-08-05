import { useState, useEffect } from 'react';
import { Home, MessageCircle, Coffee, Newspaper, Briefcase, User, Users } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp, t } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { language, user } = useApp();
  const [unreadCount, setUnreadCount] = useState(0);
  const [friendRequests, setFriendRequests] = useState(0);

  useEffect(() => {
    if (!user) return;
    fetchCounts();

    const channel = supabase
      .channel('nav-badges')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, fetchCounts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, fetchCounts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, fetchCounts)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, location.pathname]);

  const fetchCounts = async () => {
    if (!user) return;

    const [{ count: msgCount }, { count: reqCount }] = await Promise.all([
      (supabase as any)
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .is('room_id', null)
        .is('read_at', null),
      (supabase as any)
        .from('friendships')
        .select('id', { count: 'exact', head: true })
        .eq('addressee_id', user.id)
        .eq('status', 'pending'),
    ]);

    setUnreadCount(msgCount || 0);
    setFriendRequests(reqCount || 0);
  };

  const navItems = [
    { icon: Home, label: t('home', language), path: '/home' },
    { icon: MessageCircle, label: t('chat', language), path: '/conversations', badge: unreadCount },
    { icon: Coffee, label: t('bunaRooms', language), path: '/rooms' },
    { icon: Users, label: 'Enteta', path: '/friends', badge: friendRequests },
    { icon: Newspaper, label: t('news', language), path: '/news' },
    { icon: Briefcase, label: t('opportunities', language), path: '/opportunities' },
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
            {typeof badge === 'number' && badge > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                {badge > 99 ? '99+' : badge}
              </span>
            )}
          </div>
          <span className="text-[10px] font-medium">{label}</span>
        </button>
      ))}
    </nav>
  );
};

export default BottomNav;
