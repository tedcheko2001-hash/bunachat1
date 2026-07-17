import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, Heart, Send, X } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import VerifiedBadge from '@/components/VerifiedBadge';
import CommentItem, { CommentNode, CommentProfile } from '@/components/CommentItem';
import { timeAgo } from '@/lib/timeAgo';

interface Post {
  id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  user_id: string;
}

interface CommentRow {
  id: string;
  content: string;
  comment_order: number;
  created_at: string;
  edited_at: string | null;
  parent_id: string | null;
  user_id: string;
}

const PostDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useApp();
  const [post, setPost] = useState<Post | null>(null);
  const [postProfile, setPostProfile] = useState<CommentProfile | null>(null);
  const [rows, setRows] = useState<CommentRow[]>([]);
  const [likes, setLikes] = useState<Record<string, { count: number; mine: boolean }>>({});
  const [commentProfiles, setCommentProfiles] = useState<Record<string, CommentProfile>>({});
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<CommentNode | null>(null);
  const [likesCount, setLikesCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    void fetchPost();
    void fetchComments();
    void checkLikeStatus();

    const channel = supabase
      .channel(`post-${id}-comments`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments', filter: `post_id=eq.${id}` }, () => { void fetchComments(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comment_likes' }, () => { void fetchComments(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  const fetchPost = async () => {
    const { data } = await supabase
      .from('posts').select('id, content, image_url, created_at, user_id').eq('id', id).single();
    if (data) {
      setPost(data);
      const { data: p } = await (supabase as any)
        .from('profiles_public')
        .select('user_id, name, avatar_url, is_verified')
        .eq('user_id', data.user_id)
        .single();
      if (p) setPostProfile(p);
    }
    setLoading(false);
  };

  const fetchComments = async () => {
    const { data } = await supabase
      .from('comments')
      .select('id, content, comment_order, created_at, edited_at, parent_id, user_id')
      .eq('post_id', id)
      .order('created_at', { ascending: true });
    if (!data) return;
    setRows(data as CommentRow[]);

    // profiles
    const userIds = [...new Set(data.map((c: any) => c.user_id))];
    if (userIds.length) {
      const { data: profs } = await (supabase as any)
        .from('profiles_public')
        .select('user_id, name, avatar_url, is_verified')
        .in('user_id', userIds);
      const map: Record<string, CommentProfile> = {};
      (profs || []).forEach((p: any) => { map[p.user_id] = p; });
      setCommentProfiles(map);
    }

    // like counts
    const commentIds = data.map((c: any) => c.id);
    if (commentIds.length) {
      const { data: likeRows } = await supabase
        .from('comment_likes')
        .select('comment_id, user_id')
        .in('comment_id', commentIds);
      const counts: Record<string, { count: number; mine: boolean }> = {};
      commentIds.forEach((cid) => { counts[cid] = { count: 0, mine: false }; });
      (likeRows || []).forEach((r: any) => {
        counts[r.comment_id].count += 1;
        if (user && r.user_id === user.id) counts[r.comment_id].mine = true;
      });
      setLikes(counts);
    }
  };

  const tree = useMemo<CommentNode[]>(() => {
    const nodes: Record<string, CommentNode> = {};
    rows.forEach((r) => {
      nodes[r.id] = {
        id: r.id,
        user_id: r.user_id,
        content: r.content,
        comment_order: r.comment_order,
        created_at: r.created_at,
        edited_at: r.edited_at,
        parent_id: r.parent_id,
        like_count: likes[r.id]?.count || 0,
        liked_by_me: likes[r.id]?.mine || false,
        children: [],
      };
    });
    const roots: CommentNode[] = [];
    rows.forEach((r) => {
      const n = nodes[r.id];
      if (r.parent_id && nodes[r.parent_id]) nodes[r.parent_id].children.push(n);
      else roots.push(n);
    });
    return roots;
  }, [rows, likes]);

  const totalComments = rows.length;

  const checkLikeStatus = async () => {
    if (!user || !id) return;
    const { data: likesRows } = await supabase.from('likes').select('id, user_id').eq('post_id', id);
    setLikesCount(likesRows?.length || 0);
    setIsLiked(!!likesRows?.some((l) => l.user_id === user.id));
  };

  const handleLike = async () => {
    if (!user || !id) return;
    if (isLiked) {
      await supabase.from('likes').delete().match({ post_id: id, user_id: user.id });
      setLikesCount((c) => c - 1);
      setIsLiked(false);
    } else {
      await supabase.from('likes').insert({ post_id: id, user_id: user.id });
      setLikesCount((c) => c + 1);
      setIsLiked(true);
    }
  };

  const handleComment = async () => {
    if (!newComment.trim() || !user || !id) return;
    const parentId = replyTo?.id || null;
    // Round label only applies to top-level comments
    const topLevelCount = rows.filter((r) => !r.parent_id).length;
    const commentOrder = parentId ? 0 : Math.min(topLevelCount + 1, 3);

    const { error } = await supabase.from('comments').insert({
      post_id: id,
      user_id: user.id,
      content: newComment.trim().slice(0, 2000),
      comment_order: commentOrder,
      parent_id: parentId,
    } as any);

    if (error) toast.error('Failed to post comment');
    else {
      setNewComment('');
      setReplyTo(null);
    }
  };

  const handleReply = (parent: CommentNode) => {
    setReplyTo(parent);
  };

  const handleLikeComment = async (c: CommentNode) => {
    if (!user) return;
    if (c.liked_by_me) {
      await supabase.from('comment_likes').delete().match({ comment_id: c.id, user_id: user.id });
    } else {
      await supabase.from('comment_likes').insert({ comment_id: c.id, user_id: user.id });
    }
  };

  const handleDeleteComment = async (c: CommentNode) => {
    await supabase.from('comments').delete().eq('id', c.id);
    toast.success('Comment deleted');
  };

  const handleEditComment = async (c: CommentNode, content: string) => {
    const { error } = await supabase.from('comments').update({ content }).eq('id', c.id);
    if (error) toast.error('Could not save edit');
  };

  const openAuthor = () => {
    if (!post || !user) return;
    if (post.user_id === user.id) navigate('/profile');
    else navigate(`/u/${post.user_id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="loading-dots"><span /><span /><span /></div>
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
      <header className="buna-header px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2"><ArrowLeft size={24} /></button>
        <h1 className="font-semibold text-lg">Post</h1>
      </header>

      <div className="p-4">
        <div className="buna-card p-4 mb-4">
          <div className="flex items-center gap-3 mb-3">
            <button onClick={openAuthor} className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden shrink-0">
              {postProfile?.avatar_url ? (
                <img src={postProfile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-primary font-bold text-lg">{postProfile?.name?.charAt(0) || 'U'}</span>
              )}
            </button>
            <div className="min-w-0">
              <button onClick={openAuthor} className="flex items-center gap-1.5 hover:underline">
                <p className="font-semibold">{postProfile?.name || 'User'}</p>
                {postProfile?.is_verified && <VerifiedBadge size={16} />}
              </button>
              <p className="text-sm text-muted-foreground">{timeAgo(post.created_at)}</p>
            </div>
          </div>

          {post.content && <p className="mb-4 whitespace-pre-wrap">{post.content}</p>}
          {post.image_url && (
            <img src={post.image_url} alt="" className="w-full rounded-xl mb-4 max-h-80 object-cover" />
          )}

          <button
            onClick={handleLike}
            className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
          >
            <Heart size={20} fill={isLiked ? 'currentColor' : 'none'} className={isLiked ? 'text-destructive' : ''} />
            <span>{likesCount} likes</span>
          </button>
        </div>

        <div className="space-y-1 mb-28">
          <h3 className="font-semibold mb-2">Comments ({totalComments})</h3>
          {tree.length === 0 ? (
            <p className="text-muted-foreground text-sm">No comments yet. Be the first!</p>
          ) : (
            tree.map((n) => (
              <CommentItem
                key={n.id}
                comment={n}
                profiles={commentProfiles}
                currentUserId={user?.id || null}
                onReply={handleReply}
                onLike={handleLikeComment}
                onDelete={handleDeleteComment}
                onEdit={handleEditComment}
              />
            ))
          )}
        </div>
      </div>

      <div className="fixed bottom-20 left-0 right-0 p-3 bg-card border-t border-border">
        {replyTo && (
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2 px-1">
            <span>Replying to <strong>{commentProfiles[replyTo.user_id]?.name || 'user'}</strong></span>
            <button onClick={() => setReplyTo(null)} className="p-1"><X size={14} /></button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleComment(); } }}
            placeholder={replyTo ? 'Write a reply…' : 'Add a comment…'}
            className="input-buna flex-1"
            maxLength={2000}
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
