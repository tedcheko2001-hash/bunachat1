import { ArrowLeft, Coffee, Heart, MessageCircle, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '@/components/BottomNav';

const NotificationsPage = () => {
  const navigate = useNavigate();

  // Empty notifications for now - can be populated from database later
  const notifications: any[] = [];

  return (
    <div className="page-container bg-background">
      {/* Header */}
      <header className="buna-header px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2">
          <ArrowLeft size={24} />
        </button>
        <h1 className="font-semibold text-lg">Notifications</h1>
      </header>

      <div className="p-4">
        {notifications.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <span className="text-5xl mb-4 block">☕️</span>
            <p className="font-medium">No notifications yet</p>
            <p className="text-sm mt-1">We'll let you know when something happens!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div key={notification.id} className="buna-card p-4">
                {/* Notification content would go here */}
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default NotificationsPage;
