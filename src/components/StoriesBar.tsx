import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';

export interface Story {
  id: string;
  user_id: string;
  media_url: string;
  media_type: 'image' | 'video';
  caption: string | null;
  created_at: string;
  expires_at: string;
}

export interface StoryGroup {
  user_id: string;
  name: string;
  avatar_url: string | null;
  stories: Story[];
  hasUnseen: boolean;
}

interface StoriesBarProps {
  onCreate: () => void;
  onOpen: (userId: string) => void;
}

const StoriesBar = ({ onCreate, onOpen }: StoriesBarProps) => {
  const { user } = useApp();
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [myAvatar, setMyAvatar] = useState<string | null>(null);
  const [myName, setMyName] = useState<string>('You');

  useEffect(() => {
    if (!user) return;
    void loadStories();

    const channel = supabase
      .channel('stories-bar')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stories' }, () => {
        void loadStories();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const loadStories = async () => {
    if (!user) return;

    // My own profile for the "Your Story" bubble
    const { data: myProfile } = await supabase
      .from('profiles')
      .select('name, avatar_url')
      .eq('user_id', user.id)
      .maybeSingle();
    if (myProfile) {
      setMyAvatar(myProfile.avatar_url);
      setMyName(myProfile.name || 'You');
    }

    // Active stories (RLS enforces visibility & expiry)
    const { data: stories } = await supabase
      .from('stories')
      .select('id, user_id, media_url, media_type, caption, created_at, expires_at')
      .order('created_at', { ascending: true });

    if (!stories || stories.length === 0) {
      setGroups([]);
      return;
    }

    const userIds = Array.from(new Set(stories.map(s => s.user_id)));
    const { data: profiles } = await (supabase as any)
      .from('profiles_public')
      .select('user_id, name, avatar_url')
      .in('user_id', userIds);
    const pMap: Record<string, { name: string; avatar_url: string | null }> = {};
    profiles?.forEach((p: any) => { pMap[p.user_id] = { name: p.name, avatar_url: p.avatar_url }; });

    // Which stories has the current user viewed?
    const { data: myViews } = await supabase
      .from('story_views')
      .select('story_id')
      .eq('viewer_id', user.id);
    const viewed = new Set((myViews || []).map(v => v.story_id));

    // Group by user_id
    const byUser = new Map<string, Story[]>();
    stories.forEach(s => {
      const arr = byUser.get(s.user_id) || [];
      arr.push(s as Story);
      byUser.set(s.user_id, arr);
    });

    const grouped: StoryGroup[] = Array.from(byUser.entries()).map(([uid, list]) => ({
      user_id: uid,
      name: pMap[uid]?.name || (uid === user.id ? myName : 'User'),
      avatar_url: pMap[uid]?.avatar_url || null,
      stories: list,
      hasUnseen: list.some(s => !viewed.has(s.id)),
    }));

    // Put own group first if it exists
    grouped.sort((a, b) => {
      if (a.user_id === user.id) return -1;
      if (b.user_id === user.id) return 1;
      return Number(b.hasUnseen) - Number(a.hasUnseen);
    });

    setGroups(grouped);
  };

  return (
    <div className="px-4 py-3 border-b border-border">
      <div className="flex gap-3 overflow-x-auto hide-scrollbar">
        {/* Your Story creator */}
        <button
          onClick={onCreate}
          className="flex flex-col items-center gap-1 shrink-0"
          aria-label="Add your story"
        >
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-dashed border-border">
              {myAvatar ? (
                <img src={myAvatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-lg font-bold text-primary">{myName.charAt(0)}</span>
              )}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center border-2 border-card">
              <Plus size={14} />
            </div>
          </div>
          <span className="text-xs font-medium text-foreground max-w-[64px] truncate">Your Story</span>
        </button>

        {/* Other stories */}
        {groups
          .filter(g => g.user_id !== user?.id)
          .map(g => (
            <button
              key={g.user_id}
              onClick={() => onOpen(g.user_id)}
              className="flex flex-col items-center gap-1 shrink-0"
            >
              <div className={g.hasUnseen ? 'story-ring' : 'story-ring-seen'}>
                <div className="w-14 h-14 rounded-full bg-card overflow-hidden border-2 border-card">
                  {g.avatar_url ? (
                    <img src={g.avatar_url} alt={g.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <span className="text-lg font-bold text-primary">{g.name.charAt(0)}</span>
                    </div>
                  )}
                </div>
              </div>
              <span className="text-xs font-medium text-foreground max-w-[64px] truncate">{g.name}</span>
            </button>
          ))}

        {/* If current user has stories, show their group too */}
        {groups
          .filter(g => g.user_id === user?.id)
          .map(g => (
            <button
              key={g.user_id}
              onClick={() => onOpen(g.user_id)}
              className="flex flex-col items-center gap-1 shrink-0"
            >
              <div className={g.hasUnseen ? 'story-ring' : 'story-ring-seen'}>
                <div className="w-14 h-14 rounded-full bg-card overflow-hidden border-2 border-card">
                  {g.avatar_url ? (
                    <img src={g.avatar_url} alt={g.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <span className="text-lg font-bold text-primary">{g.name.charAt(0)}</span>
                    </div>
                  )}
                </div>
              </div>
              <span className="text-xs font-medium text-foreground max-w-[64px] truncate">Your Story</span>
            </button>
          ))}
      </div>
    </div>
  );
};

export default StoriesBar;
