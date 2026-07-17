import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp, t } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import HeroSection from '@/components/HeroSection';
import UserSearch from '@/components/UserSearch';
import StoriesBar from '@/components/StoriesBar';
import StoryCreator from '@/components/StoryCreator';
import StoryViewer from '@/components/StoryViewer';
import ReactionPicker, { REACTIONS, ReactionType, getReaction } from '@/components/ReactionPicker';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import VerifiedBadge from '@/components/VerifiedBadge';
import {
  MessageCircle, Coffee, Newspaper, Briefcase,
  ChevronRight, Plus, Image as ImageIcon, MessageSquare, Search, X,
  Globe, Users, Lock,
} from 'lucide-react';

type Visibility = 'public' | 'friends' | 'private';

interface LikeRow { id: string; user_id: string; reaction_type: string; }

interface Post {
  id: string;
  content: string;
  image_url: string | null;
  image_urls: string[] | null;
  visibility: string;
  created_at: string;
  user_id: string;
  likes: LikeRow[];
  comments: { id: string }[];
}

const HomePage = () => {
  const navigate = useNavigate();
  const { user, language } = useApp();
  const [posts, setPosts] = useState<Post[]>([]);
  const [profiles, setProfiles] = useState<Record<string, { name: string; avatar_url: string | null; is_verified?: boolean }>>({});
  const [showPostModal, setShowPostModal] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [postImages, setPostImages] = useState<File[]>([]);
  const [postVisibility, setPostVisibility] = useState<Visibility>('public');
  const [posting, setPosting] = useState(false);

  // Stories UI state
  const [showStoryCreator, setShowStoryCreator] = useState(false);
  const [viewingStoriesOf, setViewingStoriesOf] = useState<string | null>(null);

  useEffect(() => {
    void fetchPosts();

    const channel = supabase
      .channel('posts-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => { void fetchPosts(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'likes' }, () => { void fetchPosts(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        id, content, image_url, image_urls, visibility, created_at, user_id,
        likes (id, user_id, reaction_type),
        comments (id)
      `)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error && data) {
      setPosts(data as unknown as Post[]);

      const userIds = [...new Set(data.map((p: any) => p.user_id))];
      if (userIds.length > 0) {
        const { data: profilesData } = await (supabase as any)
          .from('profiles_public')
          .select('user_id, name, avatar_url, is_verified')
          .in('user_id', userIds);
        if (profilesData) {
          const map: Record<string, { name: string; avatar_url: string | null; is_verified?: boolean }> = {};
          profilesData.forEach((p: any) => { map[p.user_id] = { name: p.name, avatar_url: p.avatar_url, is_verified: p.is_verified }; });
          setProfiles(map);
        }
      }
    }
  };




  const handleAddPostImages = (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files).slice(0, 10 - postImages.length);
    setPostImages(prev => [...prev, ...arr]);
  };

  const removePostImage = (idx: number) => {
    setPostImages(prev => prev.filter((_, i) => i !== idx));
  };

  const handlePost = async () => {
    if (!postContent.trim() || !user) return;

    setPosting(true);
    try {
      const uploaded: string[] = [];
      for (const f of postImages) {
        const ext = f.name.split('.').pop() || 'jpg';
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('posts').upload(fileName, f);
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('posts').getPublicUrl(fileName);
          uploaded.push(urlData.publicUrl);
        } else {
          console.error('Upload error:', uploadError);
        }
      }

      const { error } = await supabase.from('posts').insert({
        user_id: user.id,
        content: postContent.trim(),
        image_url: uploaded[0] || null,      // backward compat with single-image posts
        image_urls: uploaded.length > 0 ? uploaded : null,
        visibility: postVisibility,
      } as any);

      if (error) throw error;

      toast.success('Posted successfully!');
      setPostContent('');
      setPostImages([]);
      setPostVisibility('public');
      setShowPostModal(false);
      void fetchPosts();
    } catch (err) {
      console.error('Failed to post:', err);
      toast.error('Failed to post. Please try again.');
    } finally {
      setPosting(false);
    }
  };

  const handleReact = async (postId: string, type: ReactionType | null) => {
    if (!user) return;
    const post = posts.find(p => p.id === postId);
    const mine = post?.likes.find(l => l.user_id === user.id);

    if (type === null && mine) {
      await supabase.from('likes').delete().eq('id', mine.id);
    } else if (mine && type) {
      await (supabase as any).from('likes').update({ reaction_type: type }).eq('id', mine.id);
    } else if (type) {
      await (supabase as any).from('likes').insert({ post_id: postId, user_id: user.id, reaction_type: type });
    }
    void fetchPosts();
  };

  const reactionSummary = (likes: LikeRow[]) => {
    const counts: Record<string, number> = {};
    likes.forEach(l => { counts[l.reaction_type] = (counts[l.reaction_type] || 0) + 1; });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([type]) => getReaction(type as ReactionType).emoji);
  };

  const quickActions = [
    { icon: MessageCircle, label: 'Chat', color: 'bg-primary', onClick: () => navigate('/conversations') },
    { icon: Coffee, label: t('bunaRooms', language), color: 'bg-buna-brown', onClick: () => navigate('/rooms') },
    { icon: Newspaper, label: t('news', language), color: 'bg-buna-gold', onClick: () => navigate('/news') },
    { icon: Briefcase, label: t('opportunities', language), color: 'bg-accent', onClick: () => navigate('/opportunities') },
  ];

  const latestNews = [
    { title: 'Ethiopia Hosts African Union Summit 2026', source: 'Ethiopian Monitor' },
    { title: 'New Coffee Export Records Set', source: 'Business Ethiopia' },
    { title: 'Tech Hub Opens in Addis Ababa', source: 'Tech Africa' },
  ];

  const visibilityIcon = (v: string) => {
    if (v === 'friends') return <Users size={12} />;
    if (v === 'private') return <Lock size={12} />;
    return <Globe size={12} />;
  };

  return (
    <div className="page-container bg-background">
      <Header />

      {/* Stories row */}
      <StoriesBar
        onCreate={() => setShowStoryCreator(true)}
        onOpen={(uid) => setViewingStoriesOf(uid)}
      />

      {/* Search Toggle */}
      <div className="mx-4 mt-4">
        <button
          onClick={() => setShowSearch(!showSearch)}
          className="w-full buna-card p-3 flex items-center gap-3 hover:bg-muted/50 transition-colors"
        >
          <Search size={20} className="text-muted-foreground" />
          <span className="text-muted-foreground">Search users...</span>
        </button>
      </div>

      {showSearch && (
        <div className="mx-4 mt-2">
          <UserSearch onClose={() => setShowSearch(false)} />
        </div>
      )}

      {/* Hero Section */}
      <HeroSection />




      {/* Quick Actions */}
      <div className="grid grid-cols-4 gap-3 mx-4 mt-6">
        {quickActions.map(({ icon: Icon, label, color, onClick }) => (
          <button
            key={label}
            onClick={onClick}
            className={`quick-action-btn ${color} text-white shadow-md`}
          >
            <Icon size={28} />
            <span className="text-xs font-medium">{label}</span>
          </button>
        ))}
      </div>

      {/* Global Chat Quick Access */}
      <button
        onClick={() => navigate('/conversations')}
        className="mx-4 mt-6 buna-card p-4 flex items-center justify-between w-full hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
            <MessageCircle size={24} className="text-primary" />
          </div>
          <div className="text-left">
            <span className="font-semibold block">Global Chat</span>
            <span className="text-sm text-muted-foreground">Join the conversation</span>
          </div>
        </div>
        <ChevronRight size={24} className="text-muted-foreground" />
      </button>

      {/* Post Button */}
      <div className="mx-4 mt-6">
        <button
          onClick={() => setShowPostModal(true)}
          className="w-full buna-card p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <Plus size={24} className="text-primary" />
          </div>
          <span className="text-muted-foreground font-medium">Buna... What's on your mind?</span>
        </button>
      </div>

      {/* Study Buna */}
      <button
        onClick={() => navigate('/study')}
        className="mx-4 mt-6 buna-card p-4 flex items-center justify-between w-full"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">☕️</span>
          <span className="font-semibold">{t('studyBuna', language)}</span>
          <span className="text-xl">☕️</span>
        </div>
        <ChevronRight size={24} className="text-muted-foreground" />
      </button>

      {/* Latest News */}
      <div className="mx-4 mt-6">
        <h3 className="font-semibold mb-3">{t('latestNews', language)}</h3>
        <div className="space-y-3">
          {latestNews.map((news, idx) => (
            <button
              key={idx}
              onClick={() => navigate('/news')}
              className="w-full buna-card p-4 text-left hover:bg-muted/50 transition-colors"
            >
              <p className="font-medium text-sm">{news.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{news.source}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Posts Feed */}
      {posts.length > 0 && (
        <div className="mx-4 mt-6 space-y-4 pb-4">
          <h3 className="font-semibold">Recent Posts</h3>
          {posts.map(post => {
            const profile = profiles[post.user_id];
            const myReaction = post.likes.find(l => l.user_id === user?.id)?.reaction_type as ReactionType | undefined;
            const images = post.image_urls && post.image_urls.length > 0
              ? post.image_urls
              : (post.image_url ? [post.image_url] : []);
            const topReactions = reactionSummary(post.likes);

            return (
              <div key={post.id} className="buna-card p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-primary font-bold">{profile?.name?.charAt(0) || 'U'}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <button
                      onClick={() => profile && user && (post.user_id === user.id ? navigate('/profile') : navigate(`/u/${post.user_id}`))}
                      className="flex items-center gap-1.5 hover:underline"
                    >
                      <p className="font-medium text-sm">{profile?.name || 'User'}</p>
                      {profile?.is_verified && <VerifiedBadge size={14} />}
                    </button>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      {new Date(post.created_at).toLocaleDateString()}
                      <span className="inline-flex items-center gap-1">
                        · {visibilityIcon(post.visibility)}
                        <span className="capitalize">{post.visibility}</span>
                      </span>
                    </p>
                  </div>
                </div>

                {post.content && <p className="text-sm mb-3 whitespace-pre-wrap">{post.content}</p>}

                {images.length === 1 && (
                  <img src={images[0]} alt="" className="w-full rounded-xl mb-3 max-h-80 object-cover" />
                )}
                {images.length > 1 && (
                  <div className={`grid gap-2 mb-3 ${images.length === 2 ? 'grid-cols-2' : 'grid-cols-2'}`}>
                    {images.slice(0, 4).map((src, i) => (
                      <div key={i} className={`relative rounded-xl overflow-hidden ${images.length === 3 && i === 0 ? 'row-span-2' : ''}`}>
                        <img src={src} alt="" className="w-full h-full object-cover aspect-square" />
                        {i === 3 && images.length > 4 && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-bold text-xl">
                            +{images.length - 4}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Reaction summary line */}
                {post.likes.length > 0 && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <span className="flex -space-x-1">
                      {topReactions.map((e, i) => (
                        <span key={i} className="text-base leading-none">{e}</span>
                      ))}
                    </span>
                    <span>{post.likes.length}</span>
                  </div>
                )}

                <div className="flex items-center gap-6 pt-2 border-t border-border">
                  <ReactionPicker
                    currentReaction={myReaction || null}
                    count={post.likes.length}
                    onReact={(type) => handleReact(post.id, type)}
                  />
                  <button
                    onClick={() => navigate(`/post/${post.id}`)}
                    className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                  >
                    <MessageSquare size={18} />
                    <span className="text-sm">{post.comments.length}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Post Modal */}
      {showPostModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center">
          <div className="bg-card w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 slide-up max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Create Post</h3>
              <button onClick={() => setShowPostModal(false)}><X size={24} className="text-muted-foreground" /></button>
            </div>

            <textarea
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              placeholder="Buna... Share your thoughts"
              className="input-buna min-h-24 resize-none"
            />

            {postImages.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-3">
                {postImages.map((f, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-muted">
                    <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => removePostImage(i)}
                      className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1"
                      aria-label="Remove image"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3 mt-4">
              <label className="flex items-center gap-2 px-4 py-2 bg-muted rounded-xl cursor-pointer hover:bg-muted/80">
                <ImageIcon size={20} />
                <span className="text-sm">Add photos ({postImages.length}/10)</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleAddPostImages(e.target.files)}
                />
              </label>
            </div>

            {/* Visibility selector */}
            <div className="mt-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">Who can see this?</p>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { v: 'public', icon: Globe, label: 'Public' },
                  { v: 'friends', icon: Users, label: 'Friends' },
                  { v: 'private', icon: Lock, label: 'Only me' },
                ] as const).map(({ v, icon: Icon, label }) => (
                  <button
                    key={v}
                    onClick={() => setPostVisibility(v)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-colors ${
                      postVisibility === v ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'
                    }`}
                    type="button"
                  >
                    <Icon size={18} />
                    <span className="text-xs font-medium">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setShowPostModal(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handlePost} disabled={posting || !postContent.trim()}>
                {posting ? 'Posting...' : 'Post'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showStoryCreator && (
        <StoryCreator
          onClose={() => setShowStoryCreator(false)}
          onCreated={() => { /* realtime channel refreshes StoriesBar */ }}
        />
      )}

      {viewingStoriesOf && (
        <StoryViewer userId={viewingStoriesOf} onClose={() => setViewingStoriesOf(null)} />
      )}

      {!showPostModal && !showStoryCreator && !viewingStoriesOf && <BottomNav />}
    </div>
  );
};

export default HomePage;
