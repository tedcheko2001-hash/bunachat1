import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import VerifiedBadge from '@/components/VerifiedBadge';
import { MessageCircle } from 'lucide-react';

export interface UserIdentityProfile {
  user_id: string;
  name: string | null;
  username?: string | null;
  avatar_url?: string | null;
  is_verified?: boolean | null;
}

interface UserIdentityProps {
  profile: UserIdentityProfile;
  /** Avatar size in px */
  size?: number;
  /** Extra line under the username (timestamp, status, ...) */
  subtitle?: ReactNode;
  /** Show a quick "message" icon button (hidden for your own identity) */
  showMessage?: boolean;
  /** Right-hand slot for custom actions */
  actions?: ReactNode;
  className?: string;
}

/**
 * Single reusable identity block: avatar + display name + @username.
 * Everything is keyed off `user_id` and links to the user's profile page.
 */
const UserIdentity = ({
  profile,
  size = 40,
  subtitle,
  showMessage = false,
  actions,
  className = '',
}: UserIdentityProps) => {
  const navigate = useNavigate();
  const { user } = useApp();
  const isMe = !!user && user.id === profile.user_id;
  const name = profile.name || 'Buna member';

  const openProfile = () => {
    if (!profile.user_id) return;
    navigate(isMe ? '/profile' : `/u/${profile.user_id}`);
  };

  return (
    <div className={`flex items-center gap-3 min-w-0 ${className}`}>
      <button
        onClick={openProfile}
        style={{ width: size, height: size }}
        className="rounded-full bg-primary/20 flex items-center justify-center overflow-hidden shrink-0"
        aria-label={`Open ${name}'s profile`}
      >
        {profile.avatar_url ? (
          <img src={profile.avatar_url} alt={`${name} avatar`} className="w-full h-full object-cover" />
        ) : (
          <span className="text-primary font-bold" style={{ fontSize: size / 2.4 }}>
            {name.charAt(0).toUpperCase()}
          </span>
        )}
      </button>

      <div className="flex-1 min-w-0 text-left">
        <button onClick={openProfile} className="flex items-center gap-1.5 max-w-full hover:underline">
          <span className="font-medium text-sm truncate">{name}</span>
          {profile.is_verified && <VerifiedBadge size={14} />}
        </button>
        {profile.username && (
          <button
            onClick={openProfile}
            className="text-xs text-primary hover:underline block truncate"
          >
            @{profile.username}
          </button>
        )}
        {subtitle && <div className="text-xs text-muted-foreground truncate">{subtitle}</div>}
      </div>

      {showMessage && !isMe && profile.user_id && (
        <button
          onClick={() => navigate(`/dm/${profile.user_id}`)}
          className="p-2 text-muted-foreground hover:text-primary transition-colors shrink-0"
          aria-label={`Message ${name}`}
        >
          <MessageCircle size={18} />
        </button>
      )}

      {actions}
    </div>
  );
};

export default UserIdentity;
