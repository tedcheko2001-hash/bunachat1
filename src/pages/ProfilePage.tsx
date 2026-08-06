import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp, t } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import BottomNav from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  ArrowLeft, Camera, Settings, Bell, Shield,
  Bot, LogOut, Mail, ChevronRight, Moon, Globe, Edit2, Check, X, Info, BadgeCheck, Users,
  PhoneCall, GraduationCap,
} from 'lucide-react';

import VerifiedBadge from '@/components/VerifiedBadge';

interface Profile {
  name: string;
  username: string | null;
  email: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_verified: boolean;
}


const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, language, darkMode, setDarkMode, setLanguage, signOut } = useApp();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [showAbout, setShowAbout] = useState(false);
  const [stats, setStats] = useState({ posts: 0, followers: 0, following: 0, friends: 0 });


  useEffect(() => {
    if (user) {
      fetchProfile();
      void fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    if (!user) return;
    const [posts, followers, following, friends] = await Promise.all([
      (supabase as any).from('posts').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      (supabase as any).from('follows').select('id', { count: 'exact', head: true }).eq('following_id', user.id),
      (supabase as any).from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', user.id),
      (supabase as any)
        .from('friendships')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'accepted')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`),
    ]);
    setStats({
      posts: posts.count || 0,
      followers: followers.count || 0,
      following: following.count || 0,
      friends: friends.count || 0,
    });
  };


  const fetchProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!error && data) {
      setProfile(data as any);
      setNewName(data.name);
      setNewUsername(((data as any).username as string) || '');
    } else if (!data) {
      const base = (user.email?.split('@')[0] || 'buna').toLowerCase().replace(/[^a-z0-9_]/g, '') || 'buna';
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          user_id: user.id,
          name: user.email?.split('@')[0] || 'User',
          email: user.email,
          username: `${base}${Math.floor(Math.random() * 9000 + 1000)}`,
        } as any)
        .select()
        .single();

      if (!createError && newProfile) {
        setProfile(newProfile as any);
        setNewName(newProfile.name);
        setNewUsername(((newProfile as any).username as string) || '');
      }
    }
  };

  const handleUpdateName = async () => {
    if (!user || !newName.trim()) return;

    const { error } = await supabase
      .from('profiles')
      .update({ name: newName.trim() })
      .eq('user_id', user.id);

    if (error) {
      toast.error('Failed to update name');
    } else {
      toast.success('Name updated!');
      setEditingName(false);
      fetchProfile();
    }
  };

  const handleUpdateUsername = async () => {
    if (!user) return;
    const clean = newUsername.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (clean.length < 3) {
      toast.error('Username must be at least 3 characters (letters, numbers, _)');
      return;
    }
    const { error } = await supabase
      .from('profiles')
      .update({ username: clean } as any)
      .eq('user_id', user.id);

    if (error) {
      toast.error(error.message.includes('duplicate') ? 'That username is taken' : 'Failed to update username');
    } else {
      toast.success('Username updated!');
      setEditingUsername(false);
      fetchProfile();
    }
  };


  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      await supabase
        .from('profiles')
        .update({ avatar_url: urlData.publicUrl })
        .eq('user_id', user.id);

      toast.success('Profile picture updated!');
      fetchProfile();
    } catch (err) {
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const menuItems = [
    { icon: BadgeCheck, label: profile?.is_verified ? 'Buna Sini Verified' : 'Get Verified', onClick: () => navigate('/verify'), highlight: true },
    { icon: Users, label: 'Buna Enteta (Friends)', onClick: () => navigate('/friends') },
    { icon: PhoneCall, label: 'Call History', onClick: () => navigate('/calls') },
    { icon: GraduationCap, label: 'Study Buna', onClick: () => navigate('/study') },
    { icon: Bell, label: 'Notifications', onClick: () => navigate('/notifications') },
    { icon: Settings, label: t('settings', language), onClick: () => navigate('/settings') },
    { icon: Shield, label: 'Privacy', onClick: () => navigate('/privacy') },
    { icon: Bot, label: 'Abol Assist', onClick: () => navigate('/assistant') },
    { icon: Info, label: 'About Buna Chat', onClick: () => setShowAbout(true) },
  ];


  return (
    <div className="page-container bg-background">
      {/* Header */}
      <header className="buna-header px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2">
          <ArrowLeft size={24} />
        </button>
        <h1 className="font-semibold text-lg">{t('profile', language)}</h1>
      </header>

      {/* Profile Card */}
      <div className="mx-4 mt-6 buna-card p-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl text-primary font-bold">
                  {profile?.name?.charAt(0) || 'U'}
                </span>
              )}
            </div>
            <label className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity">
              <Camera size={16} className="text-primary-foreground" />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
                disabled={uploading}
              />
            </label>
          </div>

          <div className="flex-1">
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="input-buna py-1 px-2 text-lg font-semibold"
                  autoFocus
                />
                <button 
                  onClick={handleUpdateName}
                  className="p-1 text-primary hover:bg-primary/10 rounded"
                >
                  <Check size={20} />
                </button>
                <button 
                  onClick={() => {
                    setEditingName(false);
                    setNewName(profile?.name || '');
                  }}
                  className="p-1 text-muted-foreground hover:bg-muted rounded"
                >
                  <X size={20} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold">{profile?.name || 'Buna member'}</h2>
                {profile?.is_verified && <VerifiedBadge size={18} />}
                <button
                  onClick={() => setEditingName(true)}
                  className="p-1 text-muted-foreground hover:text-primary transition-colors"
                >
                  <Edit2 size={16} />
                </button>
              </div>
            )}
            {editingUsername ? (
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="input-buna py-1 px-2 text-sm"
                  placeholder="username"
                  autoFocus
                />
                <button onClick={handleUpdateUsername} className="p-1 text-primary hover:bg-primary/10 rounded">
                  <Check size={18} />
                </button>
                <button
                  onClick={() => { setEditingUsername(false); setNewUsername(profile?.username || ''); }}
                  className="p-1 text-muted-foreground hover:bg-muted rounded"
                >
                  <X size={18} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-1">
                <p className="text-sm text-primary">@{profile?.username || 'set-username'}</p>
                <button
                  onClick={() => setEditingUsername(true)}
                  className="p-1 text-muted-foreground hover:text-primary transition-colors"
                  aria-label="Edit username"
                >
                  <Edit2 size={14} />
                </button>
              </div>
            )}

            <div className="flex items-center gap-2 text-muted-foreground mt-1">
              <Mail size={14} />
              <span className="text-sm">••••••@••••.•••</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mx-4 mt-4 buna-card p-4 grid grid-cols-4 text-center">
        {[
          { label: 'Posts', value: stats.posts, onClick: () => navigate('/home') },
          { label: 'Followers', value: stats.followers, onClick: () => navigate('/friends') },
          { label: 'Following', value: stats.following, onClick: () => navigate('/friends') },
          { label: 'Enteta', value: stats.friends, onClick: () => navigate('/friends') },
        ].map((s) => (
          <button key={s.label} onClick={s.onClick} className="py-1">
            <p className="text-lg font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </button>
        ))}
      </div>



      {/* Quick Settings */}
      <div className="mx-4 mt-6 buna-card">
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors rounded-t-2xl"
        >
          <div className="flex items-center gap-3">
            <Moon size={20} className="text-muted-foreground" />
            <span className="font-medium">{t('darkMode', language)}</span>
          </div>
          <div className={`w-12 h-6 rounded-full transition-colors ${darkMode ? 'bg-primary' : 'bg-muted'}`}>
            <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${darkMode ? 'translate-x-6' : 'translate-x-0.5'} mt-0.5`} />
          </div>
        </button>

        <button
          onClick={() => setLanguage(language === 'en' ? 'am' : 'en')}
          className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors border-t border-border"
        >
          <div className="flex items-center gap-3">
            <Globe size={20} className="text-muted-foreground" />
            <span className="font-medium">{t('language', language)}</span>
          </div>
          <span className="text-muted-foreground">{language === 'en' ? 'English' : 'አማርኛ'}</span>
        </button>
      </div>

      {/* Menu Items */}
      <div className="mx-4 mt-6 buna-card overflow-hidden">
        {menuItems.map((item, idx) => (
          <button
            key={item.label}
            onClick={item.onClick}
            className={`w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors ${
              idx > 0 ? 'border-t border-border' : ''
            } ${item.highlight ? 'bg-primary/5' : ''}`}
          >
            <div className="flex items-center gap-3">
              <item.icon size={20} className={item.highlight ? 'text-primary' : 'text-muted-foreground'} />
              <span className={`font-medium ${item.highlight ? 'text-primary' : ''}`}>{item.label}</span>
            </div>
            <ChevronRight size={20} className="text-muted-foreground" />
          </button>
        ))}
      </div>

      {/* Sign Out */}
      <div className="mx-4 mt-6">
        <Button
          variant="destructive"
          className="w-full py-4 rounded-xl flex items-center justify-center gap-2"
          onClick={handleSignOut}
        >
          <LogOut size={20} />
          {t('signOut', language)}
        </Button>
      </div>

      {/* About Modal */}
      {showAbout && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-3xl p-6 slide-up">
            <div className="text-center mb-6">
              <span className="text-5xl">☕️</span>
              <h2 className="text-2xl font-bold mt-4 font-script text-primary">Buna Chat</h2>
              <p className="text-muted-foreground mt-2">Version 1.0.0</p>
            </div>
            
            <div className="space-y-4 text-sm">
              <p>
                <strong>Buna Chat</strong> is a social platform inspired by the rich Ethiopian coffee culture. 
                The name "Buna" (ቡና) means coffee in Amharic, and this app brings the warmth 
                and community spirit of the Ethiopian coffee ceremony to the digital world.
              </p>
              
              <p>
                <strong>Features:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Connect with friends through posts and comments</li>
                <li>Join Buna Rooms for group discussions</li>
                <li>Learn about Ethiopian coffee culture with Study Buna</li>
                <li>Get help from Abol Assist, your AI coffee guide</li>
                <li>Stay updated with Ethiopian news and opportunities</li>
              </ul>
              
              <p className="text-muted-foreground">
                "Nu Buna Tetu!" - Come drink coffee with us! ☕️
              </p>
              
              <p className="text-center pt-4">
                from <span className="brand-gradient-text">Teds Online Company</span>
              </p>
            </div>
            
            <Button
              className="w-full mt-6"
              onClick={() => setShowAbout(false)}
            >
              Close
            </Button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default ProfilePage;
