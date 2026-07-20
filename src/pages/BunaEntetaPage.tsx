import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';
import BottomNav from '@/components/BottomNav';
import VerifiedBadge from '@/components/VerifiedBadge';
import { toast } from 'sonner';
import { ArrowLeft, UserPlus, Check, X, UserMinus, Users, Sparkles } from 'lucide-react';

interface ProfileLite {
  user_id: string;
  name: string;
  avatar_url: string | null;
  is_verified?: boolean;
}
interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted';
  profile: ProfileLite;
}

type Tab = 'friends' | 'requests' | 'suggestions';

const BunaEntetaPage = () => {
  const navigate = useNavigate();
  const { user } = useApp();
  const [tab, setTab] = useState<Tab>('suggestions');
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [requests, setRequests] = useState<Friendship[]>([]);
  const [suggestions, setSuggestions] = useState<ProfileLite[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: fData } = await (supabase as any)
      .from('friendships')
      .select('*')
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

    const rows = (fData || []) as any[];
    const otherIds = rows.map((r) =>
      r.requester_id === user.id ? r.addressee_id : r.requester_id
    );

    let profilesMap: Record<string, ProfileLite> = {};
    if (otherIds.length) {
      const { data: profs } = await (supabase as any)
        .from('profiles_public')
        .select('user_id, name, avatar_url, is_verified')
        .in('user_id', otherIds);
      (profs || []).forEach((p: ProfileLite) => (profilesMap[p.user_id] = p));
    }

    const enriched: Friendship[] = rows.map((r) => ({
      ...r,
      profile:
        profilesMap[r.requester_id === user.id ? r.addressee_id : r.requester_id] ||
        { user_id: '', name: 'User', avatar_url: null },
    }));

    setFriends(enriched.filter((f) => f.status === 'accepted'));
    setRequests(
      enriched.filter((f) => f.status === 'pending' && f.addressee_id === user.id)
    );

    const { data: sugg } = await (supabase as any).rpc('friend_suggestions', {
      _limit: 30,
    });
    setSuggestions((sugg || []) as ProfileLite[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const sendRequest = async (addresseeId: string, name: string) => {
    if (!user) return;
    const { error } = await (supabase as any).from('friendships').insert({
      requester_id: user.id,
      addressee_id: addresseeId,
      status: 'pending',
    });
    if (error) {
      toast.error('Could not send request');
      return;
    }
    toast.success(`Buna Enteta request sent to ${name}`);
    setSuggestions((prev) => prev.filter((p) => p.user_id !== addresseeId));
    loadAll();
  };

  const respond = async (id: string, accept: boolean) => {
    if (accept) {
      const { error } = await (supabase as any)
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', id);
      if (error) return toast.error('Failed');
      toast.success('Buna Enteta! You are now connected');
    } else {
      const { error } = await (supabase as any).from('friendships').delete().eq('id', id);
      if (error) return toast.error('Failed');
    }
    loadAll();
  };

  const removeFriend = async (id: string) => {
    const { error } = await (supabase as any).from('friendships').delete().eq('id', id);
    if (error) return toast.error('Failed');
    toast.success('Removed');
    loadAll();
  };

  const Avatar = ({ p }: { p: ProfileLite }) => (
    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden shrink-0">
      {p.avatar_url ? (
        <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
      ) : (
        <span className="text-lg text-primary font-bold">{p.name?.charAt(0) || 'U'}</span>
      )}
    </div>
  );

  return (
    <div className="page-container bg-background">
      <header className="buna-header px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2">
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="font-semibold text-lg">Buna Enteta</h1>
          <p className="text-xs text-muted-foreground">Connect with fellow coffee lovers</p>
        </div>
      </header>

      <div className="mx-4 mt-4 grid grid-cols-3 gap-2 buna-card p-1">
        {([
          { k: 'suggestions', label: 'Suggested', icon: Sparkles },
          { k: 'requests', label: `Requests${requests.length ? ` (${requests.length})` : ''}`, icon: UserPlus },
          { k: 'friends', label: 'Friends', icon: Users },
        ] as { k: Tab; label: string; icon: any }[]).map(({ k, label, icon: Icon }) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-sm font-medium transition-colors ${
              tab === k ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/50 text-muted-foreground'
            }`}
          >
            <Icon size={14} />
            <span className="truncate">{label}</span>
          </button>
        ))}
      </div>

      <div className="mx-4 mt-4 space-y-2 pb-24">
        {loading && (
          <div className="flex justify-center py-8">
            <div className="loading-dots"><span></span><span></span><span></span></div>
          </div>
        )}

        {!loading && tab === 'suggestions' && (
          <>
            {suggestions.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No suggestions right now. Check back soon!
              </p>
            )}
            {suggestions.map((p) => (
              <div key={p.user_id} className="buna-card p-3 flex items-center gap-3">
                <button onClick={() => navigate(`/u/${p.user_id}`)} className="flex items-center gap-3 flex-1 min-w-0">
                  <Avatar p={p} />
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-1">
                      <p className="font-medium truncate">{p.name}</p>
                      {p.is_verified && <VerifiedBadge size={14} />}
                    </div>
                    <p className="text-xs text-muted-foreground">New on Buna Chat</p>
                  </div>
                </button>
                <button
                  onClick={() => sendRequest(p.user_id, p.name)}
                  className="px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium flex items-center gap-1 hover:opacity-90"
                >
                  <UserPlus size={14} /> Connect
                </button>
              </div>
            ))}
          </>
        )}

        {!loading && tab === 'requests' && (
          <>
            {requests.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No pending requests</p>
            )}
            {requests.map((r) => (
              <div key={r.id} className="buna-card p-3 flex items-center gap-3">
                <button onClick={() => navigate(`/u/${r.profile.user_id}`)} className="flex items-center gap-3 flex-1 min-w-0">
                  <Avatar p={r.profile} />
                  <div className="text-left flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <p className="font-medium truncate">{r.profile.name}</p>
                      {r.profile.is_verified && <VerifiedBadge size={14} />}
                    </div>
                    <p className="text-xs text-muted-foreground">wants to connect</p>
                  </div>
                </button>
                <button
                  onClick={() => respond(r.id, true)}
                  className="p-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90"
                  aria-label="Accept"
                >
                  <Check size={16} />
                </button>
                <button
                  onClick={() => respond(r.id, false)}
                  className="p-2 rounded-lg bg-muted hover:bg-muted/70"
                  aria-label="Decline"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </>
        )}

        {!loading && tab === 'friends' && (
          <>
            {friends.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No connections yet. Send your first Buna Enteta request!
              </p>
            )}
            {friends.map((f) => (
              <div key={f.id} className="buna-card p-3 flex items-center gap-3">
                <button onClick={() => navigate(`/u/${f.profile.user_id}`)} className="flex items-center gap-3 flex-1 min-w-0">
                  <Avatar p={f.profile} />
                  <div className="text-left flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <p className="font-medium truncate">{f.profile.name}</p>
                      {f.profile.is_verified && <VerifiedBadge size={14} />}
                    </div>
                    <p className="text-xs text-muted-foreground">Buna Enteta friend</p>
                  </div>
                </button>
                <button
                  onClick={() => navigate(`/dm/${f.profile.user_id}`)}
                  className="px-3 py-2 rounded-xl bg-muted text-sm font-medium hover:bg-muted/70"
                >
                  Message
                </button>
                <button
                  onClick={() => removeFriend(f.id)}
                  className="p-2 rounded-lg hover:bg-destructive/10 text-destructive"
                  aria-label="Remove"
                >
                  <UserMinus size={16} />
                </button>
              </div>
            ))}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default BunaEntetaPage;
