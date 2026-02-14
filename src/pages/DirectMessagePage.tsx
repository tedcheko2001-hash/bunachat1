import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Send, User } from 'lucide-react';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
}

interface Profile {
  name: string;
  avatar_url: string | null;
}

const DirectMessagePage = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherProfile, setOtherProfile] = useState<Profile | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user && userId) {
      fetchProfile();
      fetchMessages();
      ensureConversation();

      const channel = supabase
        .channel(`dm-${userId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        }, (payload) => {
          const msg = payload.new as Message;
          if (
            (msg.sender_id === user.id || msg.sender_id === userId) &&
            !('room_id' in msg && (msg as any).room_id)
          ) {
            setMessages(prev => {
              if (prev.some(m => m.id === msg.id)) return prev;
              return [...prev, msg];
            });
          }
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [user, userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchProfile = async () => {
    if (!userId) return;
    const { data } = await (supabase as any)
      .from('profiles_public')
      .select('name, avatar_url')
      .eq('user_id', userId)
      .single();
    if (data) setOtherProfile(data);
  };

  const ensureConversation = async () => {
    if (!user || !userId) return;
    const { data } = await supabase
      .from('conversations')
      .select('id')
      .or(`and(user1_id.eq.${user.id},user2_id.eq.${userId}),and(user1_id.eq.${userId},user2_id.eq.${user.id})`)
      .single();

    if (!data) {
      const ids = [user.id, userId].sort();
      await supabase.from('conversations').insert({
        user1_id: ids[0],
        user2_id: ids[1],
      });
    }
  };

  const fetchMessages = async () => {
    if (!user || !userId) return;
    const { data } = await supabase
      .from('messages')
      .select('id, content, sender_id, created_at')
      .is('room_id', null)
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true })
      .limit(200);

    if (data) setMessages(data);
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !user || !userId || sending) return;

    setSending(true);
    try {
      await supabase.from('messages').insert({
        sender_id: user.id,
        receiver_id: userId,
        content: newMessage.trim(),
      });

      // Update conversation timestamp
      const ids = [user.id, userId].sort();
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .or(`and(user1_id.eq.${ids[0]},user2_id.eq.${ids[1]})`);

      // Create notification for receiver via RPC
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('name')
        .eq('user_id', user.id)
        .single();

      await supabase.rpc('create_dm_notification', {
        p_receiver_id: userId,
        p_sender_name: myProfile?.name || 'Someone',
        p_message_preview: newMessage.trim(),
      });

      setNewMessage('');
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="buna-header px-4 py-3 flex items-center gap-3 shrink-0">
        <button onClick={() => navigate('/conversations')} className="p-2 -ml-2">
          <ArrowLeft size={24} />
        </button>
        <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center overflow-hidden">
          {otherProfile?.avatar_url ? (
            <img src={otherProfile.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <User size={20} />
          )}
        </div>
        <div>
          <h1 className="font-semibold text-base">{otherProfile?.name || 'Chat'}</h1>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <span className="text-4xl mb-4">💬</span>
            <p>No messages yet</p>
            <p className="text-sm">Say hello!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] px-4 py-2 rounded-2xl ${
                  message.sender_id === user?.id
                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                    : 'bg-muted text-foreground rounded-bl-sm'
                }`}
              >
                <p className="text-sm">{message.content}</p>
                <p className={`text-xs mt-1 ${
                  message.sender_id === user?.id ? 'text-primary-foreground/70' : 'text-muted-foreground'
                }`}>
                  {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-card border-t border-border shrink-0" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type a message..."
            className="input-buna flex-1"
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            className="p-3 bg-primary text-primary-foreground rounded-xl disabled:opacity-50 transition-opacity"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DirectMessagePage;
