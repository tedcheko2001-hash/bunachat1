import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp, t } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import BottomNav from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { 
  ArrowLeft, Camera, Settings, Bell, Shield, 
  Bot, LogOut, Mail, ChevronRight, Moon, Globe 
} from 'lucide-react';

interface Profile {
  name: string;
  email: string | null;
  avatar_url: string | null;
  bio: string | null;
}

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, language, darkMode, setDarkMode, setLanguage, signOut } = useApp();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!error && data) {
      setProfile(data);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `avatar-${user.id}-${Date.now()}.${fileExt}`;

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
    { 
      icon: Bell, 
      label: 'Notifications', 
      onClick: () => navigate('/notifications') 
    },
    { 
      icon: Settings, 
      label: t('settings', language), 
      onClick: () => navigate('/settings') 
    },
    { 
      icon: Shield, 
      label: 'Privacy', 
      onClick: () => navigate('/privacy') 
    },
    { 
      icon: Bot, 
      label: 'Abol Assist', 
      onClick: () => navigate('/assistant'),
      highlight: true
    },
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
            <h2 className="text-xl font-semibold">{profile?.name || 'User'}</h2>
            <div className="flex items-center gap-2 text-muted-foreground mt-1">
              <Mail size={14} />
              <span className="text-sm">••••••@••••.•••</span>
            </div>
          </div>
        </div>
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

      <BottomNav />
    </div>
  );
};

export default ProfilePage;
