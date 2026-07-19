import { useState, useEffect } from 'react';
import { ArrowLeft, Check, CheckCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import BottomNav from '@/components/BottomNav';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  reference_id: string | null;
  is_read: boolean;
  created_at: string;
}

const NotificationsPage = () => {
  const navigate = useNavigate();
  const { user } = useApp();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchNotifications();

      const channel = supabase
        .channel('notifications-page')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
          fetchNotifications();
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) setNotifications(data);
    setLoading(false);
  };

  const deleteNotification = async (id: string) => {
    await supabase.from('notifications').delete().eq('id', id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from('notifications').delete().eq('user_id', user.id);
    setNotifications([]);
  };

  const handleClick = (n: Notification) => {
    deleteNotification(n.id);
    if (n.type === 'dm' && n.reference_id) {
      navigate(`/dm/${n.reference_id}`);
    } else if ((n.type === 'group_message' || n.type === 'group_join') && n.reference_id) {
      navigate(`/room/${n.reference_id}`);
    } else if ((n.type === 'like' || n.type === 'comment' || n.type === 'story_reply') && n.reference_id) {
      navigate(`/post/${n.reference_id}`);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'dm': return '💬';
      case 'group_message': return '👥';
      case 'group_join': return '➕';
      case 'like': return '❤️';
      case 'comment': return '💭';
      default: return '🔔';
    }
  };

  return (
    <div className="page-container bg-background">
      <header className="buna-header px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2">
          <ArrowLeft size={24} />
        </button>
        <h1 className="font-semibold text-lg flex-1">Notifications</h1>
        {notifications.some(n => !n.is_read) && (
          <button onClick={markAllRead} className="p-2 flex items-center gap-1 text-sm opacity-80">
            <CheckCheck size={18} />
          </button>
        )}
      </header>

      <div className="p-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="loading-dots"><span></span><span></span><span></span></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <span className="text-5xl mb-4 block">☕️</span>
            <p className="font-medium">No notifications yet</p>
            <p className="text-sm mt-1">We'll let you know when something happens!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={`w-full buna-card p-4 flex items-start gap-3 text-left transition-colors ${
                  !n.is_read ? 'border-primary/30' : 'opacity-70'
                }`}
              >
                <span className="text-xl mt-0.5">{getIcon(n.type)}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${!n.is_read ? 'font-semibold' : 'font-medium'}`}>{n.title}</p>
                  {n.body && <p className="text-xs text-muted-foreground mt-0.5 truncate">{n.body}</p>}
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(n.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {!n.is_read && (
                  <div className="w-2.5 h-2.5 bg-primary rounded-full mt-1.5 shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default NotificationsPage;
