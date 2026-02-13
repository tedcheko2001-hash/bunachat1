import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp, t } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import BottomNav from '@/components/BottomNav';
import UserSearch from '@/components/UserSearch';
import { ArrowLeft, Search, User, MessageCircle } from 'lucide-react';

interface Conversation {
  id: string;
  user1_id: string;
  user2_id: string;
  updated_at: string;
}

interface ConversationWithProfile extends Conversation {
  otherUser: { name: string; avatar_url: string | null; user_id: string };
  lastMessage?: { content: string; created_at: string };
  unreadCount: number;
}

const ConversationsPage = () => {
  const navigate = useNavigate();
  const { user, language } = useApp();
  const [conversations, setConversations] = useState<ConversationWithProfile[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchConversations();

      const channel = supabase
        .channel('conversations-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
          fetchConversations();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => {
          fetchConversations();
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [user]);

  const fetchConversations = async () => {
    if (!user) return;

    const { data: convos, error } = await supabase
      .from('conversations')
      .select('*')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .order('updated_at', { ascending: false });

    if (error || !convos) {
      setLoading(false);
      return;
    }

    const otherUserIds = convos.map(c => c.user1_id === user.id ? c.user2_id : c.user1_id);
    
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, name, avatar_url')
      .in('user_id', otherUserIds);

    const profileMap: Record<string, { name: string; avatar_url: string | null; user_id: string }> = {};
    profiles?.forEach(p => {
      profileMap[p.user_id] = p;
    });

    const enriched: ConversationWithProfile[] = [];

    for (const convo of convos) {
      const otherId = convo.user1_id === user.id ? convo.user2_id : convo.user1_id;
      
      const { data: lastMsg } = await supabase
        .from('messages')
        .select('content, created_at')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${user.id})`)
        .is('room_id', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      enriched.push({
        ...convo,
        otherUser: profileMap[otherId] || { name: 'User', avatar_url: null, user_id: otherId },
        lastMessage: lastMsg || undefined,
        unreadCount: 0,
      });
    }

    setConversations(enriched);
    setLoading(false);
  };

  const handleSelectUser = async (userId: string) => {
    if (!user) return;

    // Check if conversation exists
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .or(`and(user1_id.eq.${user.id},user2_id.eq.${userId}),and(user1_id.eq.${userId},user2_id.eq.${user.id})`)
      .single();

    if (existing) {
      navigate(`/dm/${userId}`);
    } else {
      const ids = [user.id, userId].sort();
      await supabase.from('conversations').insert({
        user1_id: ids[0],
        user2_id: ids[1],
      });
      navigate(`/dm/${userId}`);
    }
    setShowSearch(false);
  };

  return (
    <div className="page-container bg-background">
      <header className="buna-header px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2">
          <ArrowLeft size={24} />
        </button>
        <h1 className="font-semibold text-lg flex-1">Messages</h1>
        <button onClick={() => setShowSearch(!showSearch)} className="p-2">
          <Search size={22} />
        </button>
      </header>

      {showSearch && (
        <div className="p-4">
          <UserSearch onClose={() => setShowSearch(false)} onSelectUser={handleSelectUser} />
        </div>
      )}

      <div className="p-4 space-y-2">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="loading-dots"><span></span><span></span><span></span></div>
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <MessageCircle size={48} className="mx-auto mb-4 opacity-50" />
            <p className="font-medium">No conversations yet</p>
            <p className="text-sm mt-1">Search for a user to start chatting!</p>
            <button
              onClick={() => setShowSearch(true)}
              className="mt-4 px-6 py-2 bg-primary text-primary-foreground rounded-xl font-medium"
            >
              Start a Chat
            </button>
          </div>
        ) : (
          conversations.map((convo) => (
            <button
              key={convo.id}
              onClick={() => navigate(`/dm/${convo.otherUser.user_id}`)}
              className="w-full buna-card p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
                {convo.otherUser.avatar_url ? (
                  <img src={convo.otherUser.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User size={24} className="text-primary" />
                )}
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="font-semibold truncate">{convo.otherUser.name}</p>
                <p className="text-sm text-muted-foreground truncate">
                  {convo.lastMessage?.content || 'No messages yet'}
                </p>
              </div>
              {convo.lastMessage && (
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(convo.lastMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </button>
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default ConversationsPage;
