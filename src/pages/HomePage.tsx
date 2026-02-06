import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp, t } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import HeroSection from '@/components/HeroSection';
import UserSearch from '@/components/UserSearch';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { 
  MessageCircle, Coffee, Newspaper, Briefcase, 
  Link2, ChevronRight, Plus, Image, Heart, MessageSquare, Search, X
} from 'lucide-react';

interface Post {
  id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  user_id: string;
  likes: { id: string; user_id: string }[];
  comments: { id: string }[];
}

const HomePage = () => {
  const navigate = useNavigate();
  const { user, language } = useApp();
  const [posts, setPosts] = useState<Post[]>([]);
  const [profiles, setProfiles] = useState<Record<string, { name: string; avatar_url: string | null }>>({});
  const [showPostModal, setShowPostModal] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [postImage, setPostImage] = useState<File | null>(null);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    fetchPosts();
    
    const channel = supabase
      .channel('posts-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
        fetchPosts();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'likes' }, () => {
        fetchPosts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        id, content, image_url, created_at, user_id,
        likes (id, user_id),
        comments (id)
      `)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error && data) {
      setPosts(data);
      
      const userIds = [...new Set(data.map(p => p.user_id))];
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, name, avatar_url')
          .in('user_id', userIds);
        
        if (profilesData) {
          const profileMap: Record<string, { name: string; avatar_url: string | null }> = {};
          profilesData.forEach(p => {
            profileMap[p.user_id] = { name: p.name, avatar_url: p.avatar_url };
          });
          setProfiles(profileMap);
        }
      }
    }
  };

  const generateInviteLink = () => {
    const inviteCode = Math.random().toString(36).substring(2, 10);
    const link = `${window.location.origin}/invite/${inviteCode}`;
    navigator.clipboard.writeText(link);
    toast.success('Invite link copied to clipboard!');
  };

  const handlePost = async () => {
    if (!postContent.trim() || !user) return;

    setPosting(true);
    try {
      let imageUrl = null;

      if (postImage) {
        const fileExt = postImage.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('posts')
          .upload(fileName, postImage);

        if (uploadError) {
          console.error('Upload error:', uploadError);
        } else {
          const { data: urlData } = supabase.storage
            .from('posts')
            .getPublicUrl(fileName);
          imageUrl = urlData.publicUrl;
        }
      }

      const { error } = await supabase.from('posts').insert({
        user_id: user.id,
        content: postContent,
        image_url: imageUrl,
      });

      if (error) {
        console.error('Post error:', error);
        throw error;
      }

      toast.success('Posted successfully!');
      setPostContent('');
      setPostImage(null);
      setShowPostModal(false);
      fetchPosts();
    } catch (err) {
      console.error('Failed to post:', err);
      toast.error('Failed to post. Please try again.');
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (postId: string) => {
    if (!user) return;

    const post = posts.find(p => p.id === postId);
    const isLiked = post?.likes.some(l => l.user_id === user.id);

    if (isLiked) {
      await supabase.from('likes').delete().match({ post_id: postId, user_id: user.id });
    } else {
      await supabase.from('likes').insert({ post_id: postId, user_id: user.id });
    }
    fetchPosts();
  };

  const quickActions = [
    { icon: MessageCircle, label: 'Chat', color: 'bg-primary', onClick: () => navigate('/chat') },
    { icon: Coffee, label: t('bunaRooms', language), color: 'bg-buna-brown', onClick: () => navigate('/rooms') },
    { icon: Newspaper, label: t('news', language), color: 'bg-buna-gold', onClick: () => window.open('https://ethiopianmonitor.com', '_blank') },
    { icon: Briefcase, label: t('opportunities', language), color: 'bg-accent', onClick: () => window.open('https://ethiojobs.net/jobs', '_blank') },
  ];

  const latestNews = [
    { title: 'Ethiopia Hosts African Union Summit 2026', source: 'Ethiopian Monitor' },
    { title: 'New Coffee Export Records Set', source: 'Business Ethiopia' },
    { title: 'Tech Hub Opens in Addis Ababa', source: 'Tech Africa' },
  ];

  return (
    <div className="page-container bg-background">
      <Header />

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

      {/* Search Panel */}
      {showSearch && (
        <div className="mx-4 mt-2">
          <UserSearch onClose={() => setShowSearch(false)} />
        </div>
      )}

      {/* Hero Section */}
      <HeroSection />

      {/* Generate Invite */}
      <div className="mx-4 mt-4">
        <Button 
          onClick={generateInviteLink}
          className="w-full py-4 rounded-xl flex items-center justify-center gap-2"
        >
          <Link2 size={20} />
          {t('generateInvite', language)}
        </Button>
      </div>

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
              onClick={() => window.open('https://ethiopianmonitor.com', '_blank')}
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
        <div className="mx-4 mt-6 space-y-4">
          <h3 className="font-semibold">Recent Posts</h3>
          {posts.map(post => {
            const profile = profiles[post.user_id];
            const isLiked = user && post.likes.some(l => l.user_id === user.id);
            return (
              <div key={post.id} className="buna-card p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <span className="text-primary font-bold">
                        {profile?.name?.charAt(0) || 'U'}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{profile?.name || 'User'}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(post.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <p className="text-sm mb-3">{post.content}</p>
                
                {post.image_url && (
                  <img 
                    src={post.image_url} 
                    alt="" 
                    className="w-full rounded-xl mb-3 max-h-64 object-cover"
                  />
                )}
                
                <div className="flex items-center gap-6 pt-2 border-t border-border">
                  <button 
                    onClick={() => handleLike(post.id)}
                    className={`flex items-center gap-2 transition-colors ${
                      isLiked ? 'text-destructive' : 'text-muted-foreground hover:text-primary'
                    }`}
                  >
                    <Heart size={18} fill={isLiked ? 'currentColor' : 'none'} />
                    <span className="text-sm">{post.likes.length}</span>
                  </button>
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-card w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Create Post</h3>
              <button onClick={() => setShowPostModal(false)}>
                <X size={24} className="text-muted-foreground" />
              </button>
            </div>
            
            <textarea
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              placeholder="Buna... Share your thoughts"
              className="input-buna min-h-32 resize-none"
            />
            
            <div className="flex items-center gap-3 mt-4">
              <label className="flex items-center gap-2 px-4 py-2 bg-muted rounded-xl cursor-pointer hover:bg-muted/80">
                <Image size={20} />
                <span className="text-sm">Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setPostImage(e.target.files?.[0] || null)}
                />
              </label>
              {postImage && (
                <span className="text-sm text-primary">{postImage.name}</span>
              )}
            </div>
            
            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowPostModal(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handlePost}
                disabled={posting || !postContent.trim()}
              >
                {posting ? 'Posting...' : 'Post'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default HomePage;
