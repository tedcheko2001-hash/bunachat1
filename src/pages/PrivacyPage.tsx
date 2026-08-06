import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, Lock, Shield, UserX, Globe, Users, User } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

type Visibility = 'public' | 'friends' | 'private';

interface BlockedRow {
  id: string;
  blocked_id: string;
  name: string;
  username: string | null;
  avatar_url: string | null;
}

const visibilityOptions: Array<{ v: Visibility; icon: any; label: string; description: string }> = [
  { v: 'public', icon: Globe, label: 'Everyone', description: 'Any Buna Chat member can see your profile' },
  { v: 'friends', icon: Users, label: 'Buna Enteta only', description: 'Only your friends can see your full profile' },
  { v: 'private', icon: Lock, label: 'Only me', description: 'Your profile details stay hidden' },
];

const PrivacyPage = () => {
  const navigate = useNavigate();
  const { user } = useApp();
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [showLastSeen, setShowLastSeen] = useState(true);
  const [readReceipts, setReadReceipts] = useState<boolean>(
    () => localStorage.getItem('bunachat-read-receipts') !== 'off',
  );
  const [blocked, setBlocked] = useState<BlockedRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    void loadSettings();
    void loadBlocked();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from('user_settings')
      .select('profile_visibility, show_last_seen')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      setVisibility((data.profile_visibility as Visibility) || 'public');
      setShowLastSeen(data.show_last_seen ?? true);
    }
    setLoading(false);
  };

  const loadBlocked = async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from('blocked_users')
      .select('id, blocked_id')
      .eq('blocker_id', user.id);

    const rows = data || [];
    if (!rows.length) {
      setBlocked([]);
      return;
    }

    const { data: profs } = await (supabase as any)
      .from('profiles_public')
      .select('user_id, name, username, avatar_url')
      .in('user_id', rows.map((r: any) => r.blocked_id));

    const map = new Map((profs || []).map((p: any) => [p.user_id, p]));
    setBlocked(
      rows.map((r: any) => {
        const p: any = map.get(r.blocked_id) || {};
        return {
          id: r.id,
          blocked_id: r.blocked_id,
          name: p.name || 'Buna member',
          username: p.username ?? null,
          avatar_url: p.avatar_url ?? null,
        };
      }),
    );
  };

  const saveSetting = async (patch: Record<string, unknown>) => {
    if (!user) return;
    const { error } = await (supabase as any)
      .from('user_settings')
      .upsert({ user_id: user.id, ...patch }, { onConflict: 'user_id' });
    if (error) {
      toast.error('Could not save your privacy setting');
      return false;
    }
    toast.success('Privacy setting saved');
    return true;
  };

  const handleVisibility = async (v: Visibility) => {
    const prev = visibility;
    setVisibility(v);
    const ok = await saveSetting({ profile_visibility: v });
    if (!ok) setVisibility(prev);
  };

  const handleLastSeen = async (value: boolean) => {
    setShowLastSeen(value);
    const ok = await saveSetting({ show_last_seen: value });
    if (!ok) setShowLastSeen(!value);
  };

  const handleReadReceipts = (value: boolean) => {
    setReadReceipts(value);
    localStorage.setItem('bunachat-read-receipts', value ? 'on' : 'off');
    toast.success('Privacy setting saved');
  };

  const unblock = async (row: BlockedRow) => {
    const { error } = await (supabase as any).from('blocked_users').delete().eq('id', row.id);
    if (error) {
      toast.error('Could not unblock');
      return;
    }
    setBlocked(prev => prev.filter(b => b.id !== row.id));
    toast.success(`${row.name} unblocked`);
  };

  return (
    <div className="page-container bg-background">
      <header className="buna-header px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2">
          <ArrowLeft size={24} />
        </button>
        <h1 className="font-semibold text-lg">Privacy</h1>
      </header>

      <div className="p-4 pb-24 space-y-6">
        {/* Profile visibility */}
        <section>
          <h3 className="text-sm font-medium text-muted-foreground mb-2 px-1 flex items-center gap-2">
            <Eye size={16} /> Profile visibility
          </h3>
          <div className="buna-card overflow-hidden">
            {visibilityOptions.map(({ v, icon: Icon, label, description }, idx) => (
              <button
                key={v}
                onClick={() => void handleVisibility(v)}
                disabled={loading}
                className={`w-full p-4 flex items-center justify-between text-left hover:bg-muted/50 transition-colors ${
                  idx > 0 ? 'border-t border-border' : ''
                } ${visibility === v ? 'bg-primary/5' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <Icon size={20} className="text-muted-foreground" />
                  <div>
                    <p className="font-medium">{label}</p>
                    <p className="text-sm text-muted-foreground">{description}</p>
                  </div>
                </div>
                {visibility === v && (
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* Toggles */}
        <section>
          <h3 className="text-sm font-medium text-muted-foreground mb-2 px-1 flex items-center gap-2">
            <Shield size={16} /> Activity
          </h3>
          <div className="buna-card overflow-hidden">
            <button
              onClick={() => void handleLastSeen(!showLastSeen)}
              className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors text-left"
            >
              <div>
                <p className="font-medium">Last seen</p>
                <p className="text-sm text-muted-foreground">Show when you were last online</p>
              </div>
              <div className={`w-12 h-6 rounded-full transition-colors shrink-0 ${showLastSeen ? 'bg-primary' : 'bg-muted'}`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${showLastSeen ? 'translate-x-6' : 'translate-x-0.5'} mt-0.5`} />
              </div>
            </button>

            <button
              onClick={() => handleReadReceipts(!readReceipts)}
              className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors text-left border-t border-border"
            >
              <div>
                <p className="font-medium">Read receipts</p>
                <p className="text-sm text-muted-foreground">Let others know when you read their messages</p>
              </div>
              <div className={`w-12 h-6 rounded-full transition-colors shrink-0 ${readReceipts ? 'bg-primary' : 'bg-muted'}`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${readReceipts ? 'translate-x-6' : 'translate-x-0.5'} mt-0.5`} />
              </div>
            </button>
          </div>
        </section>

        {/* Blocked users */}
        <section>
          <h3 className="text-sm font-medium text-muted-foreground mb-2 px-1 flex items-center gap-2">
            <UserX size={16} /> Blocked users ({blocked.length})
          </h3>
          <div className="buna-card overflow-hidden">
            {blocked.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                <span className="text-3xl">☕️</span>
                <p className="text-sm mt-2">You haven't blocked anyone.</p>
                <p className="text-xs">You can block someone from any private chat.</p>
              </div>
            ) : (
              blocked.map((row, idx) => (
                <div key={row.id} className={`p-3 flex items-center gap-3 ${idx > 0 ? 'border-t border-border' : ''}`}>
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden shrink-0">
                    {row.avatar_url ? (
                      <img src={row.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User size={18} className="text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{row.name}</p>
                    {row.username && <p className="text-xs text-primary truncate">@{row.username}</p>}
                  </div>
                  <Button size="sm" variant="outline" onClick={() => void unblock(row)}>
                    Unblock
                  </Button>
                </div>
              ))
            )}
          </div>
        </section>

        <div className="p-4 bg-muted/50 rounded-xl">
          <h3 className="font-medium mb-2">Your data</h3>
          <p className="text-sm text-muted-foreground">
            Your email and personal information are kept private and secure. We never share your data with third parties.
          </p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default PrivacyPage;
