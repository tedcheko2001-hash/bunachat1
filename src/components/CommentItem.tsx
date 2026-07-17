import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MessageSquare, MoreVertical, Trash2, Edit3, Check, X } from 'lucide-react';
import VerifiedBadge from './VerifiedBadge';
import { timeAgo } from '@/lib/timeAgo';

export interface CommentProfile {
  user_id: string;
  name: string;
  avatar_url: string | null;
  is_verified?: boolean;
}

export interface CommentNode {
  id: string;
  user_id: string;
  content: string;
  comment_order: number;
  created_at: string;
  edited_at: string | null;
  parent_id: string | null;
  like_count: number;
  liked_by_me: boolean;
  children: CommentNode[];
}

interface Props {
  comment: CommentNode;
  profiles: Record<string, CommentProfile>;
  currentUserId: string | null;
  onReply: (parent: CommentNode) => void;
  onLike: (comment: CommentNode) => void;
  onDelete: (comment: CommentNode) => void;
  onEdit: (comment: CommentNode, content: string) => Promise<void>;
  depth?: number;
}

const rounds = ['', 'Abol', 'Bereka', 'Tona'];

const CommentItem = ({
  comment,
  profiles,
  currentUserId,
  onReply,
  onLike,
  onDelete,
  onEdit,
  depth = 0,
}: Props) => {
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.content);
  const [menuOpen, setMenuOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const profile = profiles[comment.user_id];
  const isMine = currentUserId === comment.user_id;
  const isTopLevel = !comment.parent_id;
  const roundLabel = isTopLevel && comment.comment_order >= 1 && comment.comment_order <= 3
    ? rounds[comment.comment_order]
    : '';

  const goToProfile = () => {
    if (!currentUserId) return;
    if (comment.user_id === currentUserId) navigate('/profile');
    else navigate(`/u/${comment.user_id}`);
  };

  const submitEdit = async () => {
    const value = draft.trim();
    if (!value || value === comment.content) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onEdit(comment, value);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={depth > 0 ? 'ml-10 mt-2' : 'mt-2'}>
      <div className="flex items-start gap-2">
        <button onClick={goToProfile} className="shrink-0" aria-label="Open profile">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-primary text-xs font-bold">
                {profile?.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            )}
          </div>
        </button>

        <div className="flex-1 min-w-0">
          <div className="bg-muted rounded-2xl px-3 py-2 relative">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={goToProfile}
                className="font-semibold text-sm hover:underline"
              >
                {profile?.name || 'User'}
              </button>
              {profile?.is_verified && <VerifiedBadge size={14} />}
              {roundLabel && (
                <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-full font-medium">
                  {roundLabel}
                </span>
              )}
              {isMine && (
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="ml-auto p-1 text-muted-foreground hover:text-foreground"
                  aria-label="Comment options"
                >
                  <MoreVertical size={14} />
                </button>
              )}
            </div>

            {editing ? (
              <div className="mt-1">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className="w-full resize-none bg-background rounded-lg p-2 text-sm min-h-16"
                  autoFocus
                  maxLength={2000}
                />
                <div className="flex gap-2 mt-1">
                  <button
                    onClick={submitEdit}
                    disabled={saving}
                    className="text-xs flex items-center gap-1 text-primary font-medium disabled:opacity-50"
                  >
                    <Check size={14} /> Save
                  </button>
                  <button
                    onClick={() => { setDraft(comment.content); setEditing(false); }}
                    className="text-xs flex items-center gap-1 text-muted-foreground"
                  >
                    <X size={14} /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm mt-0.5 whitespace-pre-wrap break-words">{comment.content}</p>
            )}

            {menuOpen && isMine && !editing && (
              <div className="absolute right-2 top-8 bg-popover border border-border rounded-xl shadow-lg py-1 z-10">
                <button
                  onClick={() => { setMenuOpen(false); setEditing(true); }}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted w-full"
                >
                  <Edit3 size={14} /> Edit
                </button>
                <button
                  onClick={() => { setMenuOpen(false); onDelete(comment); }}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted w-full text-destructive"
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 mt-1 pl-2 text-xs text-muted-foreground">
            <span>{timeAgo(comment.created_at)}</span>
            {comment.edited_at && <span className="italic">Edited</span>}
            <button
              onClick={() => onLike(comment)}
              className={`flex items-center gap-1 hover:text-primary transition-colors ${
                comment.liked_by_me ? 'text-destructive font-medium' : ''
              }`}
            >
              <Heart size={12} fill={comment.liked_by_me ? 'currentColor' : 'none'} />
              {comment.like_count > 0 && <span>{comment.like_count}</span>}
              <span>Like</span>
            </button>
            <button
              onClick={() => onReply(comment)}
              className="flex items-center gap-1 hover:text-primary transition-colors"
            >
              <MessageSquare size={12} /> Reply
            </button>
          </div>

          {comment.children.length > 0 && (
            <div className="mt-1">
              {comment.children.map((child) => (
                <CommentItem
                  key={child.id}
                  comment={child}
                  profiles={profiles}
                  currentUserId={currentUserId}
                  onReply={onReply}
                  onLike={onLike}
                  onDelete={onDelete}
                  onEdit={onEdit}
                  depth={depth + 1}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommentItem;
