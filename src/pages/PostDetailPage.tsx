import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ArrowLeft, Heart, Send } from 'lucide-react';
import BottomNav from '@/components/BottomNav';

interface Post {
  id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  user_id: string;
}

interface Profile {
  name: string;
  avatar_url: string | null;
}

interface Comment {
  id: string;
  content: string;
  comment_order: number;
  created_at: string;
  user_id: string;
}

const getCommentLabel = (order: number): string => {
  switch (order) {
    case 1: return 'Abol';
    case 2: return 'Bereka';
    case 3: return 'Tona';
    default: return '';
  }
};

const PostDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useApp();
  const [post, setPost] = useState<Post | null>(null);
  const [postProfile, setPostProfile] = useState<Profile | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentProfiles, setCommentProfiles] = useState<Record<string, Profile>>({});
  const [newComment, setNewComment] = useState('');
  const [likesCount, setLikesCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchPost();
      fetchComments();
      checkLikeStatus();
    }

    const channel = supabase
      .channel(`post-${id}-comments`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'comments',
        filter: `post_id=eq.${id}`
      }, () => {
        fetchComments();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const fetchPost = async () => {
    const { data, error } = await supabase
      .from('posts')
      .select('id, content, image_url, created_at, user_id')
      .eq('id', id)
      .single();

    if (!error && data) {
      setPost(data);
      
      // Fetch profile separately
      const { data: profileData } = await supabase
        .from('profiles')
        .select('name, avatar_url')
        .eq('user_id', data.user_id)
        .single();
      
      if (profileData) {
        setPostProfile(profileData);
      }
    }
    setLoading(false);
  };

  const fetchComments = async () => {
    const { data, error } = await supabase
      .from('comments')
      .select('id, content, comment_order, created_at, user_id')
      .eq('post_id', id)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setComments(data);
      
      // Fetch profiles for commenters
      const userIds = [...new Set(data.map(c => c.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, name, avatar_url')
        .in('user_id', userIds);
      
      if (profilesData) {
        const profileMap: Record<string, Profile> = {};
        profilesData.forEach(p => {
          profileMap[p.user_id] = { name: p.name, avatar_url: p.avatar_url };
        });
        setCommentProfiles(profileMap);
      }
    }
  };

  const checkLikeStatus = async () => {
    if (!user || !id) return;

    const { data: likes } = await supabase
      .from('likes')
      .select('id')
      .eq('post_id', id);

    setLikesCount(likes?.length || 0);

    const { data: userLike } = await supabase
      .from('likes')
      .select('id')
      .eq('post_id', id)
      .eq('user_id', user.id)
      .single();

    setIsLiked(!!userLike);
  };

  const handleLike = async () => {
    if (!user || !id) return;

    if (isLiked) {
      await supabase.from('likes').delete().match({ post_id: id, user_id: user.id });
      setLikesCount(prev => prev - 1);
      setIsLiked(false);
    } else {
      await supabase.from('likes').insert({ post_id: id, user_id: user.id });
      setLikesCount(prev => prev + 1);
      setIsLiked(true);
    }
  };

  const handleComment = async () => {
    if (!newComment.trim() || !user || !id) return;

    const commentOrder = Math.min(comments.length + 1, 3);

    const { error } = await supabase.from('comments').insert({
      post_id: id,
      user_id: user.id,
      content: newComment.trim(),
      comment_order: commentOrder,
    });

    if (error) {
      toast.error('Failed to post comment');
    } else {
      setNewComment('');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="loading-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Post not found</p>
      </div>
    );
  }

  return (
    <div className="page-container bg-background">
      {/* Header */}
      <header className="buna-header px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2">
          <ArrowLeft size={24} />
        </button>
        <h1 className="font-semibold text-lg">Post</h1>
      </header>

      <div className="p-4">
        {/* Post */}
        <div className="buna-card p-4 mb-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              {postProfile?.avatar_url ? (
                <img src={postProfile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                <span className="text-primary font-bold text-lg">
                  {postProfile?.name?.charAt(0) || 'U'}
                </span>
              )}
            </div>
            <div>
              <p className="font-semibold">{postProfile?.name || 'User'}</p>
              <p className="text-sm text-muted-foreground">
                {new Date(post.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          <p className="mb-4">{post.content}</p>

          {post.image_url && (
            <img 
              src={post.image_url} 
              alt="" 
              className="w-full rounded-xl mb-4 max-h-80 object-cover"
            />
          )}

          <button 
            onClick={handleLike}
            className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
          >
            <Heart size={20} fill={isLiked ? 'currentColor' : 'none'} className={isLiked ? 'text-destructive' : ''} />
            <span>{likesCount} likes</span>
          </button>
        </div>

        {/* Comments */}
        <div className="space-y-3 mb-24">
          <h3 className="font-semibold">Comments ({comments.length})</h3>
          
          {comments.length === 0 ? (
            <p className="text-muted-foreground text-sm">No comments yet. Be the first!</p>
          ) : (
            comments.map((comment) => {
              const profile = commentProfiles[comment.user_id];
              return (
                <div key={comment.id} className="buna-card p-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-primary font-bold text-sm">
                        {profile?.name?.charAt(0) || 'U'}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{profile?.name || 'User'}</span>
                        {comment.comment_order <= 3 && (
                          <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full font-medium">
                            {getCommentLabel(comment.comment_order)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm mt-1">{comment.content}</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Comment Input */}
      <div className="fixed bottom-20 left-0 right-0 p-4 bg-card border-t border-border">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="input-buna flex-1"
          />
          <button
            onClick={handleComment}
            disabled={!newComment.trim()}
            className="p-3 bg-primary text-primary-foreground rounded-xl disabled:opacity-50 transition-opacity"
          >
            <Send size={20} />
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default PostDetailPage;
