import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Send, User, Trash2, Phone, Video as VideoIcon } from 'lucide-react';
import { useCall } from '@/contexts/CallContext';
import { toast } from 'sonner';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  read_at?: string | null;
}

interface Profile {
  user_id?: string;
  name: string;
  username?: string | null;
  avatar_url: string | null;
  is_verified?: boolean | null;
}

const DirectMessagePage = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useApp();
  const { startCall } = useCall();
  const otherUserId = userId;
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherProfile, setOtherProfile] = useState<Profile | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const presenceRef = useRef<any>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSent = useRef(0);

  const threadKey = user && userId ? [user.id, userId].sort().join('__') : null;

  const markIncomingRead = async () => {
    if (!user || !userId) return;
    await (supabase as any)
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('sender_id', userId)
      .eq('receiver_id', user.id)
      .is('read_at', null);
  };

  useEffect(() => {
    if (user && userId) {
      fetchProfile();
      fetchMessages();
      ensureConversation();
      void markIncomingRead();
      // Auto-delete DM notifications from this sender when the chat is opened
      supabase.from('notifications')
        .delete()
        .eq('user_id', user.id)
        .eq('type', 'dm')
        .eq('reference_id', userId)
        .then(() => {});

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
            if (msg.sender_id === userId) void markIncomingRead();
          }
        })
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
        }, (payload) => {
          const msg = payload.new as Message;
          setMessages(prev => prev.map(m => (m.id === msg.id ? { ...m, read_at: msg.read_at } : m)));
        })
        .subscribe();

      // Typing indicator channel (ephemeral broadcast)
      const typing = supabase
        .channel(`typing-${threadKey}`, { config: { broadcast: { self: false } } })
        .on('broadcast', { event: 'typing' }, (payload: any) => {
          if (payload?.payload?.userId !== userId) return;
          setOtherTyping(!!payload.payload.typing);
          if (typingTimeout.current) clearTimeout(typingTimeout.current);
          if (payload.payload.typing) {
            typingTimeout.current = setTimeout(() => setOtherTyping(false), 3000);
          }
        })
        .subscribe();
      presenceRef.current = typing;

      return () => {
        supabase.removeChannel(channel);
        supabase.removeChannel(typing);
        if (typingTimeout.current) clearTimeout(typingTimeout.current);
      };
    }
  }, [user, userId]);

  const sendTyping = (typing: boolean) => {
    if (!presenceRef.current || !user) return;
    const now = Date.now();
    if (typing && now - lastTypingSent.current < 1200) return;
    lastTypingSent.current = now;
    presenceRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: user.id, typing },
    });
  };


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchProfile = async () => {
    if (!userId) return;
    const { data } = await (supabase as any)
      .from('profiles_public')
      .select('user_id, name, username, avatar_url, is_verified')
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
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-base truncate">{otherProfile?.name || 'Chat'}</h1>
        </div>
        {otherUserId && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => void startCall(otherUserId, false, otherProfile?.name, otherProfile?.avatar_url ?? null)}
              className="p-2 rounded-full hover:bg-primary-foreground/10 transition-colors"
              aria-label="Voice call"
            >
              <Phone size={20} />
            </button>
            <button
              onClick={() => void startCall(otherUserId, true, otherProfile?.name, otherProfile?.avatar_url ?? null)}
              className="p-2 rounded-full hover:bg-primary-foreground/10 transition-colors"
              aria-label="Video call"
            >
              <VideoIcon size={20} />
            </button>
          </div>
        )}
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
          messages.map((message) => {
            const isMe = message.sender_id === user?.id;
            return (
              <div
                key={message.id}
                className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}
              >
                <div className={`max-w-[75%] relative`}>
                  <div
                    className={`px-4 py-2 rounded-2xl ${
                      isMe
                        ? 'bg-primary text-primary-foreground rounded-br-sm'
                        : 'bg-muted text-foreground rounded-bl-sm'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <p className={`text-xs mt-1 ${
                      isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'
                    }`}>
                      {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {isMe && (
                    <button
                      onClick={async () => {
                        await supabase.from('messages').delete().eq('id', message.id);
                        setMessages(prev => prev.filter(m => m.id !== message.id));
                        toast.success('Message deleted');
                      }}
                      className="absolute -top-2 -right-2 hidden group-hover:flex w-6 h-6 bg-destructive text-destructive-foreground rounded-full items-center justify-center"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            );
          })
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
