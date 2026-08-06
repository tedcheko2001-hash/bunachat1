import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import BottomNav from '@/components/BottomNav';
import { useCall } from '@/contexts/CallContext';
import {
  ArrowLeft, PhoneIncoming, PhoneOutgoing, PhoneMissed, Phone, Video as VideoIcon, User,
} from 'lucide-react';

interface CallRow {
  id: string;
  caller_id: string;
  callee_id: string;
  video: boolean;
  duration_seconds: number;
  status: string;
  created_at: string;
}

interface ProfileLite {
  name: string;
  username: string | null;
  avatar_url: string | null;
}

const formatDuration = (s: number) => {
  if (!s) return '';
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
};

const CallHistoryPage = () => {
  const navigate = useNavigate();
  const { user } = useApp();
  const { startCall } = useCall();
  const [calls, setCalls] = useState<CallRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    void load();

    const channel = supabase
      .channel('call-history-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'call_history' }, () => void load())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const load = async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from('call_history')
      .select('*')
      .or(`caller_id.eq.${user.id},callee_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(100);

    const rows = (data || []) as CallRow[];
    setCalls(rows);

    const ids = Array.from(new Set(rows.map(r => (r.caller_id === user.id ? r.callee_id : r.caller_id))));
    if (ids.length) {
      const { data: profs } = await (supabase as any)
        .from('profiles_public')
        .select('user_id, name, username, avatar_url')
        .in('user_id', ids);
      const map: Record<string, ProfileLite> = {};
      (profs || []).forEach((p: any) => {
        map[p.user_id] = { name: p.name, username: p.username, avatar_url: p.avatar_url };
      });
      setProfiles(map);
    }
    setLoading(false);
  };

  return (
    <div className="page-container bg-background">
      <header className="buna-header px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2">
          <ArrowLeft size={24} />
        </button>
        <h1 className="font-semibold text-lg">Call History</h1>
      </header>

      <div className="p-4 pb-24">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="loading-dots"><span></span><span></span><span></span></div>
          </div>
        ) : calls.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <span className="text-5xl">☕️</span>
            <p className="mt-4 font-medium">No calls yet</p>
            <p className="text-sm">Your incoming and outgoing calls will appear here.</p>
          </div>
        ) : (
          <div className="buna-card overflow-hidden">
            {calls.map((call, idx) => {
              const outgoing = call.caller_id === user?.id;
              const otherId = outgoing ? call.callee_id : call.caller_id;
              const p = profiles[otherId];
              const missed = call.status !== 'answered' && call.status !== 'completed';
              const Icon = missed ? PhoneMissed : outgoing ? PhoneOutgoing : PhoneIncoming;

              return (
                <div
                  key={call.id}
                  className={`p-3 flex items-center gap-3 ${idx > 0 ? 'border-t border-border' : ''}`}
                >
                  <button
                    onClick={() => navigate(`/u/${otherId}`)}
                    className="w-11 h-11 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden shrink-0"
                    aria-label="Open profile"
                  >
                    {p?.avatar_url ? (
                      <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User size={20} className="text-primary" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{p?.name || 'Buna member'}</p>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
                      <Icon size={14} className={missed ? 'text-destructive' : 'text-primary'} />
                      <span className="capitalize">{missed ? call.status : outgoing ? 'Outgoing' : 'Incoming'}</span>
                      {call.duration_seconds > 0 && <span>· {formatDuration(call.duration_seconds)}</span>}
                      <span>· {new Date(call.created_at).toLocaleString()}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => void startCall(otherId, call.video, p?.name, p?.avatar_url ?? null)}
                    className="p-2 text-muted-foreground hover:text-primary transition-colors"
                    aria-label={call.video ? 'Video call back' : 'Call back'}
                  >
                    {call.video ? <VideoIcon size={20} /> : <Phone size={20} />}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default CallHistoryPage;
