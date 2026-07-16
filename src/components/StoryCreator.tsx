import { useState } from 'react';
import { X, Image as ImageIcon, Globe, Users, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';

type Visibility = 'public' | 'friends' | 'private';

interface StoryCreatorProps {
  onClose: () => void;
  onCreated: () => void;
}

const StoryCreator = ({ onClose, onCreated }: StoryCreatorProps) => {
  const { user } = useApp();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [submitting, setSubmitting] = useState(false);

  const handleFile = (f: File | null) => {
    setFile(f);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(f ? URL.createObjectURL(f) : null);
  };

  const handleSubmit = async () => {
    if (!file || !user) return;
    setSubmitting(true);
    try {
      const isVideo = file.type.startsWith('video/');
      const ext = file.name.split('.').pop() || (isVideo ? 'mp4' : 'jpg');
      const path = `${user.id}/${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('stories')
        .upload(path, file, { contentType: file.type });
      if (uploadErr) throw uploadErr;

      // Private bucket → use signed URL matching the 24-hour story lifetime
      const { data: signed, error: signErr } = await supabase.storage
        .from('stories')
        .createSignedUrl(path, 60 * 60 * 24);
      if (signErr || !signed) throw signErr || new Error('Could not sign URL');

      const { error: insertErr } = await supabase.from('stories').insert({
        user_id: user.id,
        media_url: signed.signedUrl,
        media_type: isVideo ? 'video' : 'image',
        caption: caption.trim() || null,
        visibility,
      });
      if (insertErr) throw insertErr;

      toast.success('Story shared');
      onCreated();
      onClose();
    } catch (err: any) {
      console.error('Story upload failed:', err);
      toast.error(err?.message || 'Failed to share story');
    } finally {
      setSubmitting(false);
    }
  };

  const visibilityOptions: Array<{ v: Visibility; icon: any; label: string }> = [
    { v: 'public', icon: Globe, label: 'Public' },
    { v: 'friends', icon: Users, label: 'Friends' },
    { v: 'private', icon: Lock, label: 'Only me' },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 z-[70] flex items-end sm:items-center justify-center">
      <div className="bg-card w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">Create Story</h3>
          <button onClick={onClose} aria-label="Close">
            <X size={22} className="text-muted-foreground" />
          </button>
        </div>

        {/* Preview */}
        <div className="bg-muted rounded-2xl aspect-[9/16] max-h-80 flex items-center justify-center overflow-hidden mb-3">
          {previewUrl ? (
            file?.type.startsWith('video/') ? (
              <video src={previewUrl} className="w-full h-full object-cover" muted playsInline />
            ) : (
              <img src={previewUrl} alt="preview" className="w-full h-full object-cover" />
            )
          ) : (
            <div className="text-center text-muted-foreground p-6">
              <ImageIcon size={40} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">Pick a photo or video</p>
            </div>
          )}
        </div>

        <label className="block">
          <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-xl cursor-pointer hover:bg-muted/80 w-fit">
            <ImageIcon size={18} />
            <span className="text-sm">Choose file</span>
          </div>
          <input
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] || null)}
          />
        </label>

        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Say something (optional)…"
          className="input-buna mt-3 min-h-20 resize-none"
          maxLength={200}
        />

        <div className="mt-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">Who can see this?</p>
          <div className="grid grid-cols-3 gap-2">
            {visibilityOptions.map(({ v, icon: Icon, label }) => (
              <button
                key={v}
                onClick={() => setVisibility(v)}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-colors ${
                  visibility === v ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'
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
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" onClick={handleSubmit} disabled={!file || submitting}>
            {submitting ? 'Sharing…' : 'Share Story'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StoryCreator;
