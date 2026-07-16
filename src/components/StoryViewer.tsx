import { useEffect, useRef, useState } from 'react';
import { X, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';
import { toast } from 'sonner';
import type { Story } from './StoriesBar';

interface Profile {
  name: string;
  avatar_url: string | null;
}

interface StoryViewerProps {
  userId: string;
  onClose: () => void;
}

const STORY_DURATION = 5000; // ms per image
const StoryViewer = ({ userId, onClose }: StoryViewerProps) => {
  const { user } = useApp();
  const [stories, setStories] = useState<Story[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const durationRef = useRef<number>(STORY_DURATION);
  const pausedRef = useRef<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const load = async () => {
    const { data: p } = await (supabase as any)
      .from('profiles_public')
      .select('name, avatar_url')
      .eq('user_id', userId)
      .maybeSingle();
    if (p) setProfile(p);

    const { data } = await supabase
      .from('stories')
      .select('id, user_id, media_url, media_type, caption, created_at, expires_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    if (data) {
      setStories(data as Story[]);
    }
  };

  const current = stories[index];

  // Log view when story changes
  useEffect(() => {
    if (!current || !user || current.user_id === user.id) return;
    void supabase.from('story_views').insert({
      story_id: current.id,
      viewer_id: user.id,
    });
  }, [current?.id, user?.id]);

  // Progress animation
  useEffect(() => {
    if (!current) return;
    startTimeRef.current = performance.now();
    durationRef.current = current.media_type === 'video' ? 15000 : STORY_DURATION;
    setProgress(0);

    const tick = (now: number) => {
      if (pausedRef.current) {
        startTimeRef.current = now - progress * durationRef.current;
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const elapsed = now - startTimeRef.current;
      const p = Math.min(1, elapsed / durationRef.current);
      setProgress(p);
      if (p >= 1) {
        goNext();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, index]);

  const goNext = () => {
    if (index < stories.length - 1) setIndex(i => i + 1);
    else onClose();
  };

  const goPrev = () => {
    if (index > 0) setIndex(i => i - 1);
  };

  const handleDelete = async () => {
    if (!current || !user || current.user_id !== user.id) return;
    const { error } = await supabase.from('stories').delete().eq('id', current.id);
    if (error) {
      toast.error('Failed to delete story');
      return;
    }
    toast.success('Story deleted');
    const remaining = stories.filter(s => s.id !== current.id);
    setStories(remaining);
    if (remaining.length === 0) onClose();
    else setIndex(Math.min(index, remaining.length - 1));
  };

  if (!current) {
    return (
      <div className="fixed inset-0 bg-black z-[80] flex items-center justify-center">
        <div className="loading-dots"><span></span><span></span><span></span></div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black z-[80] flex flex-col select-none"
      onPointerDown={() => { pausedRef.current = true; if (videoRef.current) videoRef.current.pause(); }}
      onPointerUp={() => { pausedRef.current = false; if (videoRef.current) void videoRef.current.play(); }}
      onPointerCancel={() => { pausedRef.current = false; }}
    >
      {/* Progress bars */}
      <div className="flex gap-1 p-2 pt-3 z-10">
        {stories.map((_, i) => (
          <div key={i} className="flex-1 h-1 bg-white/25 rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-[width] duration-100 ease-linear"
              style={{ width: `${i < index ? 100 : i === index ? progress * 100 : 0}%` }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 px-3 pb-2 z-10">
        <div className="w-9 h-9 rounded-full bg-white/10 overflow-hidden flex items-center justify-center">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-white font-bold">{profile?.name?.charAt(0) || '?'}</span>
          )}
        </div>
        <div className="flex-1 text-white">
          <p className="font-semibold text-sm">{profile?.name || 'User'}</p>
          <p className="text-xs opacity-80">
            {new Date(current.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        {current.user_id === user?.id && (
          <button onClick={handleDelete} className="p-2 text-white/90 hover:text-white" aria-label="Delete story">
            <Trash2 size={20} />
          </button>
        )}
        <button onClick={onClose} className="p-2 text-white/90 hover:text-white" aria-label="Close">
          <X size={22} />
        </button>
      </div>

      {/* Media */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {current.media_type === 'video' ? (
          <video
            ref={videoRef}
            src={current.media_url}
            className="max-w-full max-h-full"
            autoPlay
            playsInline
            onEnded={goNext}
          />
        ) : (
          <img src={current.media_url} alt="" className="max-w-full max-h-full object-contain" />
        )}

        {current.caption && (
          <div className="absolute bottom-8 left-4 right-4 text-white bg-black/40 backdrop-blur-sm rounded-2xl px-4 py-2 text-sm">
            {current.caption}
          </div>
        )}

        {/* Tap zones */}
        <button
          onClick={goPrev}
          className="absolute inset-y-0 left-0 w-1/3 text-white/0 hover:text-white/40"
          aria-label="Previous"
        >
          <ChevronLeft size={40} className="opacity-0 group-hover:opacity-100 ml-2" />
        </button>
        <button
          onClick={goNext}
          className="absolute inset-y-0 right-0 w-1/3 text-white/0 hover:text-white/40"
          aria-label="Next"
        >
          <ChevronRight size={40} className="opacity-0 group-hover:opacity-100 ml-auto mr-2" />
        </button>
      </div>
    </div>
  );
};

export default StoryViewer;
