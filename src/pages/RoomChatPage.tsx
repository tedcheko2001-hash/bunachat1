import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Send, Users, UserPlus, X, Trash2, LogOut, Calendar, Radio, Play, Square } from 'lucide-react';
import { toast } from 'sonner';
import LiveCeremonyView from '@/components/LiveCeremonyView';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
}

interface Profile {
  user_id: string;
  name: string;
  avatar_url: string | null;
}

interface Room {
  id: string;
  name: string;
  image_url: string | null;
}

const RoomChatPage = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user } = useApp();
  const [room, setRoom] = useState<Room | null>(null);
  const [adminUserId, setAdminUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [members, setMembers] = useState<Profile[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [addUsername, setAddUsername] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Ceremonies
  interface Ceremony {
    id: string;
    room_id: string;
    host_id: string;
    title: string;
    description: string | null;
    scheduled_at: string;
    is_live: boolean;
    started_at: string | null;
    ended_at: string | null;
  }
  const [ceremonies, setCeremonies] = useState<Ceremony[]>([]);
  const [showCeremonyModal, setShowCeremonyModal] = useState(false);
  const [ceremonyTitle, setCeremonyTitle] = useState('');
  const [ceremonyDesc, setCeremonyDesc] = useState('');
  const [ceremonyWhen, setCeremonyWhen] = useState('');
  const [activeCeremony, setActiveCeremony] = useState<Ceremony | null>(null);
  const [liveOpen, setLiveOpen] = useState(false);
  const [ceremonyParticipants, setCeremonyParticipants] = useState<Profile[]>([]);

  useEffect(() => {
    if (roomId && user) {
      fetchRoom();
      fetchMessages();
      fetchMembers();
      fetchCeremonies();
      // Auto-delete room notifications for this room when opened
      supabase.from('notifications')
        .delete()
        .eq('user_id', user.id)
        .in('type', ['group_message', 'group_join'])
        .eq('reference_id', roomId)
        .then(() => {});

      const channel = supabase
        .channel(`room-${roomId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`,
        }, (payload) => {
          const msg = payload.new as Message;
          setMessages(prev => {
            if (prev.some(m => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          // Fetch profile for new sender if needed
          if (!profiles[msg.sender_id]) {
            (supabase as any).from('profiles_public').select('user_id, name, avatar_url')
              .eq('user_id', msg.sender_id).single()
              .then(({ data }) => {
                if (data) setProfiles(prev => ({ ...prev, [data.user_id]: data }));
              });
          }
        })
        .subscribe();

      const ceremonyChannel = supabase
        .channel(`ceremonies-${roomId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'ceremonies', filter: `room_id=eq.${roomId}` }, () => {
          fetchCeremonies();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
        supabase.removeChannel(ceremonyChannel);
      };
    }
  }, [roomId, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchRoom = async () => {
    if (!roomId) return;
    const { data } = await supabase
      .from('buna_rooms')
      .select('id, name, image_url')
      .eq('id', roomId)
      .single();
    if (data) setRoom(data);
    const { data: adminId } = await (supabase as any).rpc('get_room_admin', { _room: roomId });
    if (adminId) setAdminUserId(adminId as string);
  };

  const fetchMessages = async () => {
    if (!roomId) return;
    const { data } = await supabase
      .from('messages')
      .select('id, content, sender_id, created_at')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })
      .limit(200);

    if (data) {
      setMessages(data);
      const userIds = [...new Set(data.map(m => m.sender_id))];
      if (userIds.length > 0) {
        const { data: profilesData } = await (supabase as any)
          .from('profiles_public')
          .select('user_id, name, avatar_url')
          .in('user_id', userIds);
        if (profilesData) {
          const map: Record<string, Profile> = {};
          profilesData.forEach(p => { map[p.user_id] = p; });
          setProfiles(map);
        }
      }
    }
  };

  const fetchMembers = async () => {
    if (!roomId) return;
    const { data: memberData } = await supabase
      .from('room_members')
      .select('user_id')
      .eq('room_id', roomId);

    if (memberData) {
      const userIds = memberData.map(m => m.user_id);
      const { data: profilesData } = await (supabase as any)
        .from('profiles_public')
        .select('user_id, name, avatar_url')
        .in('user_id', userIds);
      if (profilesData) setMembers(profilesData);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !user || !roomId || sending) return;

    setSending(true);
    try {
      await supabase.from('messages').insert({
        sender_id: user.id,
        room_id: roomId,
        content: newMessage.trim(),
      });

      // Notify all members except sender via RPC
      const { data: myProfile } = await supabase
        .from('profiles').select('name').eq('user_id', user.id).single();

      const otherMembers = members.filter(m => m.user_id !== user.id);
      for (const m of otherMembers) {
        await supabase.rpc('create_room_notification', {
          p_user_id: m.user_id,
          p_type: 'group_message',
          p_title: `${myProfile?.name || 'Someone'} in ${room?.name || 'group'}`,
          p_body: newMessage.trim().substring(0, 100),
          p_reference_id: roomId,
        });
      }

      setNewMessage('');
    } catch (err) {
      console.error('Failed to send:', err);
    } finally {
      setSending(false);
    }
  };

  const handleAddUser = async () => {
    if (!addUsername.trim() || !roomId || !user) return;

    const { data: profile } = await (supabase as any)
      .from('profiles_public')
      .select('user_id, name')
      .ilike('name', addUsername.trim())
      .single();

    if (!profile) {
      toast.error('User not found');
      return;
    }

    // Check if already a member
    const { data: existing } = await supabase
      .from('room_members')
      .select('id')
      .eq('room_id', roomId)
      .eq('user_id', profile.user_id)
      .single();

    if (existing) {
      toast.info('User is already a member');
      return;
    }

    const { error } = await supabase.from('room_members').insert({
      room_id: roomId,
      user_id: profile.user_id,
    });

    if (error) {
      toast.error('Failed to add user');
    } else {
      // Notify the added user via RPC
      await supabase.rpc('create_room_notification', {
        p_user_id: profile.user_id,
        p_type: 'group_join',
        p_title: `You were added to ${room?.name || 'a group'}`,
        p_body: `Welcome to the group!`,
        p_reference_id: roomId,
      });

      toast.success(`${profile.name} added!`);
      setAddUsername('');
      setShowAddUser(false);
      fetchMembers();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isAdmin = !!adminUserId && adminUserId === user?.id;

  const handleLeaveRoom = async () => {
    if (!user || !roomId) return;
    await supabase.from('room_members').delete().eq('room_id', roomId).eq('user_id', user.id);
    toast.success('You left the group');
    navigate('/rooms');
  };

  const handleDeleteMessage = async (messageId: string) => {
    await supabase.from('messages').delete().eq('id', messageId);
    setMessages(prev => prev.filter(m => m.id !== messageId));
    toast.success('Message deleted');
  };

  // ---- Ceremonies ----
  const fetchCeremonies = async () => {
    if (!roomId) return;
    const { data } = await (supabase as any)
      .from('ceremonies')
      .select('*')
      .eq('room_id', roomId)
      .is('ended_at', null)
      .order('scheduled_at', { ascending: true });
    if (data) setCeremonies(data as Ceremony[]);
  };

  const fetchParticipants = async (ceremonyId: string) => {
    const { data } = await (supabase as any)
      .from('ceremony_participants')
      .select('user_id')
      .eq('ceremony_id', ceremonyId);
    if (!data) return;
    const ids = data.map((d: any) => d.user_id);
    if (ids.length === 0) { setCeremonyParticipants([]); return; }
    const { data: profs } = await (supabase as any)
      .from('profiles_public')
      .select('user_id, name, avatar_url')
      .in('user_id', ids);
    setCeremonyParticipants((profs as Profile[]) || []);
  };

  const handleCreateCeremony = async () => {
    if (!user || !roomId || !ceremonyTitle.trim() || !ceremonyWhen) return;
    const { error } = await (supabase as any).from('ceremonies').insert({
      room_id: roomId,
      host_id: user.id,
      title: ceremonyTitle.trim(),
      description: ceremonyDesc.trim() || null,
      scheduled_at: new Date(ceremonyWhen).toISOString(),
    });
    if (error) { toast.error('Could not schedule ceremony'); return; }
    toast.success('Ceremony scheduled ☕️');
    setCeremonyTitle(''); setCeremonyDesc(''); setCeremonyWhen('');
    setShowCeremonyModal(false);
    fetchCeremonies();
  };

  const handleGoLive = async (c: Ceremony) => {
    const { error } = await (supabase as any)
      .from('ceremonies')
      .update({ is_live: true, started_at: new Date().toISOString() })
      .eq('id', c.id);
    if (error) { toast.error('Could not go live'); return; }
    // Auto-join host as participant
    await (supabase as any).from('ceremony_participants').insert({ ceremony_id: c.id, user_id: user!.id });
    toast.success('🔴 You are live!');
    setActiveCeremony({ ...c, is_live: true });
    setLiveOpen(true);
    fetchParticipants(c.id);

    // Notify room members
    const others = members.filter(m => m.user_id !== user!.id);
    for (const m of others) {
      await supabase.rpc('create_room_notification', {
        p_user_id: m.user_id,
        p_type: 'group_message',
        p_title: `🔴 Live ceremony in ${room?.name || 'the room'}`,
        p_body: c.title,
        p_reference_id: roomId!,
      });
    }
  };

  const handleEndCeremony = async (c: Ceremony) => {
    await (supabase as any)
      .from('ceremonies')
      .update({ is_live: false, ended_at: new Date().toISOString() })
      .eq('id', c.id);
    toast.success('Ceremony ended');
    setActiveCeremony(null);
    setCeremonyParticipants([]);
    fetchCeremonies();
  };

  const handleJoinLive = async (c: Ceremony) => {
    if (!user) return;
    await (supabase as any).from('ceremony_participants')
      .insert({ ceremony_id: c.id, user_id: user.id });
    setActiveCeremony(c);
    fetchParticipants(c.id);
  };

  const handleLeaveLive = async (c: Ceremony) => {
    if (!user) return;
    await (supabase as any).from('ceremony_participants')
      .delete().eq('ceremony_id', c.id).eq('user_id', user.id);
    setActiveCeremony(null);
    setCeremonyParticipants([]);
  };

  const canGoLive = (c: Ceremony) =>
    c.host_id === user?.id && !c.is_live && new Date(c.scheduled_at).getTime() <= Date.now() + 5 * 60 * 1000;



  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="buna-header px-4 py-3 flex items-center gap-3 shrink-0">
        <button onClick={() => navigate('/rooms')} className="p-2 -ml-2">
          <ArrowLeft size={24} />
        </button>
        <div className="flex-1">
          <h1 className="font-semibold text-base">{room?.name || 'Room'}</h1>
          <p className="text-xs opacity-80">{members.length} members</p>
        </div>
        <button onClick={() => setShowMembers(!showMembers)} className="p-2">
          <Users size={22} />
        </button>
        <button onClick={() => setShowAddUser(true)} className="p-2">
          <UserPlus size={22} />
        </button>
        {!isAdmin && (
          <button onClick={handleLeaveRoom} className="p-2 text-destructive">
            <LogOut size={22} />
          </button>
        )}
      </header>

      {/* Members panel */}
      {showMembers && (
        <div className="bg-card border-b border-border p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-sm">Members ({members.length})</h3>
            <button onClick={() => setShowMembers(false)}><X size={18} className="text-muted-foreground" /></button>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {members.map(m => (
              <div key={m.user_id} className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
                  {m.avatar_url ? (
                    <img src={m.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-primary text-sm font-bold">{m.name?.charAt(0)}</span>
                  )}
                </div>
                <span className="text-sm font-medium">{m.name}</span>
                {adminUserId === m.user_id && (
                  <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">Admin</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add user modal */}
      {showAddUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl p-6 w-full max-w-sm">
            <h3 className="font-semibold mb-4">Add User to Group</h3>
            <input
              type="text"
              value={addUsername}
              onChange={(e) => setAddUsername(e.target.value)}
              placeholder="Enter username..."
              className="input-buna mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowAddUser(false)}
                className="flex-1 py-2 rounded-xl border border-border font-medium"
              >Cancel</button>
              <button
                onClick={handleAddUser}
                disabled={!addUsername.trim()}
                className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50"
              >Add</button>
            </div>
          </div>
        </div>
      )}

      {/* Ceremonies bar */}
      <div className="bg-card/70 border-b border-border px-4 py-2 shrink-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <h3 className="text-sm font-semibold flex items-center gap-1">
            <Calendar size={14} /> Coffee Ceremonies
          </h3>
          <button
            onClick={() => setShowCeremonyModal(true)}
            className="text-xs px-3 py-1 rounded-full bg-primary text-primary-foreground font-medium"
          >
            + Schedule
          </button>
        </div>
        {ceremonies.length === 0 ? (
          <p className="text-xs text-muted-foreground">No upcoming ceremonies. Schedule one!</p>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {ceremonies.map((c) => {
              const when = new Date(c.scheduled_at);
              const isHost = c.host_id === user?.id;
              return (
                <div key={c.id} className={`min-w-[220px] rounded-xl p-3 border ${c.is_live ? 'border-destructive bg-destructive/10' : 'border-border bg-background'}`}>
                  <div className="flex items-center gap-1 mb-1">
                    {c.is_live && <Radio size={12} className="text-destructive animate-pulse" />}
                    <p className="text-sm font-semibold truncate">{c.title}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {c.is_live ? '🔴 Live now' : when.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <div className="flex gap-1">
                    {c.is_live ? (
                      isHost ? (
                        <button onClick={() => handleEndCeremony(c)} className="flex-1 text-xs py-1 rounded-lg bg-destructive text-destructive-foreground flex items-center justify-center gap-1">
                          <Square size={12} /> End
                        </button>
                      ) : (
                        activeCeremony?.id === c.id ? (
                          <button onClick={() => handleLeaveLive(c)} className="flex-1 text-xs py-1 rounded-lg border border-border">Leave</button>
                        ) : (
                          <button onClick={() => handleJoinLive(c)} className="flex-1 text-xs py-1 rounded-lg bg-primary text-primary-foreground">Join Live</button>
                        )
                      )
                    ) : isHost ? (
                      <button
                        onClick={() => handleGoLive(c)}
                        disabled={!canGoLive(c)}
                        className="flex-1 text-xs py-1 rounded-lg bg-primary text-primary-foreground flex items-center justify-center gap-1 disabled:opacity-50"
                      >
                        <Play size={12} /> Go Live
                      </button>
                    ) : (
                      <span className="flex-1 text-xs py-1 text-center text-muted-foreground">Scheduled</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {activeCeremony && ceremonyParticipants.length > 0 && (
          <p className="text-xs text-muted-foreground mt-2">
            🔴 {ceremonyParticipants.length} in the ceremony: {ceremonyParticipants.map(p => p.name).join(', ')}
          </p>
        )}
      </div>

      {/* Schedule Ceremony modal */}
      {showCeremonyModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl p-6 w-full max-w-sm">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Calendar size={18} /> Schedule a Coffee Ceremony
            </h3>
            <input
              type="text"
              value={ceremonyTitle}
              onChange={(e) => setCeremonyTitle(e.target.value)}
              placeholder="Ceremony title"
              className="input-buna mb-3"
            />
            <textarea
              value={ceremonyDesc}
              onChange={(e) => setCeremonyDesc(e.target.value)}
              placeholder="Description (optional)"
              rows={2}
              className="input-buna mb-3"
            />
            <label className="text-xs font-medium mb-1 block">Date & time</label>
            <input
              type="datetime-local"
              value={ceremonyWhen}
              onChange={(e) => setCeremonyWhen(e.target.value)}
              className="input-buna mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowCeremonyModal(false)}
                className="flex-1 py-2 rounded-xl border border-border font-medium"
              >Cancel</button>
              <button
                onClick={handleCreateCeremony}
                disabled={!ceremonyTitle.trim() || !ceremonyWhen}
                className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50"
              >Schedule</button>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">

        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <span className="text-4xl mb-4">☕️</span>
            <p>No messages yet</p>
            <p className="text-sm">Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => {
            const senderProfile = profiles[message.sender_id];
            const isMe = message.sender_id === user?.id;
            return (
              <div
                key={message.id}
                className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}
              >
                <div className={`max-w-[75%] ${isMe ? '' : 'flex gap-2'} relative`}>
                  {!isMe && (
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-1">
                      <span className="text-primary text-xs font-bold">
                        {senderProfile?.name?.charAt(0) || '?'}
                      </span>
                    </div>
                  )}
                  <div
                    className={`px-4 py-2 rounded-2xl ${
                      isMe
                        ? 'bg-primary text-primary-foreground rounded-br-sm'
                        : 'bg-muted text-foreground rounded-bl-sm'
                    }`}
                  >
                    {!isMe && (
                      <p className="text-xs font-semibold mb-1 opacity-80">
                        {senderProfile?.name || 'Unknown'}
                      </p>
                    )}
                    <p className="text-sm">{message.content}</p>
                    <p className={`text-xs mt-1 ${
                      isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'
                    }`}>
                      {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {isMe && (
                    <button
                      onClick={() => handleDeleteMessage(message.id)}
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

export default RoomChatPage;
