import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Search, User, X } from 'lucide-react';

interface Profile {
  user_id: string;
  name: string;
  avatar_url: string | null;
}

interface UserSearchProps {
  onClose?: () => void;
}

const UserSearch = ({ onClose }: UserSearchProps) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const searchUsers = async () => {
      if (query.trim().length < 2) {
        setResults([]);
        return;
      }

      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, name, avatar_url')
        .ilike('name', `%${query}%`)
        .limit(10);

      if (!error && data) {
        setResults(data);
      }
      setLoading(false);
    };

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  const handleSelectUser = (userId: string) => {
    // Navigate to chat for now (can be expanded to user profile later)
    navigate('/chat');
    onClose?.();
  };

  return (
    <div className="buna-card p-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search users by name..."
            className="input-buna pl-10"
            autoFocus
          />
        </div>
        {onClose && (
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg">
            <X size={20} className="text-muted-foreground" />
          </button>
        )}
      </div>

      {loading && (
        <div className="flex justify-center py-4">
          <div className="loading-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-2">
          {results.map((profile) => (
            <button
              key={profile.user_id}
              onClick={() => handleSelectUser(profile.user_id)}
              className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 rounded-xl transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User size={20} className="text-primary" />
                )}
              </div>
              <span className="font-medium">{profile.name}</span>
            </button>
          ))}
        </div>
      )}

      {!loading && query.length >= 2 && results.length === 0 && (
        <p className="text-center text-muted-foreground py-4">
          No users found matching "{query}"
        </p>
      )}

      {!loading && query.length < 2 && (
        <p className="text-center text-muted-foreground py-4 text-sm">
          Type at least 2 characters to search
        </p>
      )}
    </div>
  );
};

export default UserSearch;
