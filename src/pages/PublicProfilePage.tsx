import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';
import BottomNav from '@/components/BottomNav';
import VerifiedBadge from '@/components/VerifiedBadge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MessageCircle, UserPlus, UserMinus } from 'lucide-react';
import { toast } from 'sonner';

interface PublicProfile {
  user_id: string;
  name: string;
  avatar_url: string | null;
  bio: string | null;
  is_verified: boolean;
}

const PublicProfilePage = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useApp();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  useEffect(() => {
    if (userId && user && userId === user.id) {
      navigate('/profile', { replace: true });
      return;
    }
    if (userId) void loadAll();
  }, [userId, user]);

  const loadAll = async () => {
    if (!userId) return;
    const { data } = await (supabase as any)
      .from('profiles_public')
      .select('user_id, name, avatar_url, bio, is_verified')
      .eq('user_id', userId)
      .maybeSingle();
    setProfile(data);
    setLoading(false);

    if (user) {
      const { data: followRow } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', userId)
        .maybeSingle();
      setIsFollowing(!!followRow);
    }

    const { count: followers } = await supabase
      .from('follows')
      .select('id', { count: 'exact', head: true })
      .eq('following_id', userId);
    const { count: following } = await supabase
      .from('follows')
      .select('id', { count: 'exact', head: true })
      .eq('follower_id', userId);
    setFollowerCount(followers || 0);
    setFollowingCount(following || 0);
  };

  const toggleFollow = async () => {
    if (!user || !userId) return;
    setFollowBusy(true);
    try {
      if (isFollowing) {
        await supabase.from('follows').delete().match({ follower_id: user.id, following_id: userId });
        setIsFollowing(false);
        setFollowerCount((c) => Math.max(0, c - 1));
      } else {
        await supabase.from('follows').insert({ follower_id: user.id, following_id: userId });
        setIsFollowing(true);
        setFollowerCount((c) => c + 1);
      }
    } catch {
      toast.error('Could not update follow status');
    } finally {
      setFollowBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="loading-dots"><span /><span /><span /></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="page-container bg-background">
        <header className="buna-header px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2"><ArrowLeft size={24} /></button>
          <h1 className="font-semibold text-lg">Profile</h1>
        </header>
        <p className="text-muted-foreground text-center mt-12">User not found.</p>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="page-container bg-background">
      <header className="buna-header px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2"><ArrowLeft size={24} /></button>
        <h1 className="font-semibold text-lg">Profile</h1>
      </header>

      <div className="mx-4 mt-6 buna-card p-6">
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden shrink-0">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl text-primary font-bold">{profile.name.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-semibold">{profile.name}</h2>
              {profile.is_verified && <VerifiedBadge size={18} />}
            </div>
            {profile.bio && <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{profile.bio}</p>}
            <div className="flex gap-4 mt-3 text-sm">
              <span><strong>{followerCount}</strong> <span className="text-muted-foreground">followers</span></span>
              <span><strong>{followingCount}</strong> <span className="text-muted-foreground">following</span></span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-4">
          <Button onClick={() => navigate(`/dm/${profile.user_id}`)} className="gap-2">
            <MessageCircle size={18} /> Message
          </Button>
          <Button
            onClick={toggleFollow}
            variant={isFollowing ? 'outline' : 'default'}
            disabled={followBusy}
            className="gap-2"
          >
            {isFollowing ? <><UserMinus size={18} /> Unfollow</> : <><UserPlus size={18} /> Follow</>}
          </Button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default PublicProfilePage;
