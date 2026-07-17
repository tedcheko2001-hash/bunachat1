import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';
import BottomNav from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Upload, ShieldCheck, Clock, XCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import VerifiedBadge from '@/components/VerifiedBadge';
import { z } from 'zod';

const inputSchema = z.object({
  legal_name: z.string().trim().min(2, 'Legal name is required').max(120),
  username: z.string().trim().min(2, 'Username is required').max(60),
});

type Status = 'pending' | 'approved' | 'rejected';

interface RequestRow {
  id: string;
  status: Status;
  review_notes: string | null;
  created_at: string;
}

const VerificationRequestPage = () => {
  const navigate = useNavigate();
  const { user } = useApp();
  const [existing, setExisting] = useState<RequestRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [legalName, setLegalName] = useState('');
  const [username, setUsername] = useState('');
  const [idFile, setIdFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const { data } = await supabase
        .from('verification_requests')
        .select('id, status, review_notes, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setExisting((data as RequestRow) || null);
      setLoading(false);
    })();
  }, [user]);

  const uploadFile = async (file: File, kind: 'id' | 'selfie') => {
    if (!user) throw new Error('Not signed in');
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${user.id}/${kind}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('verifications').upload(path, file, { upsert: true });
    if (error) throw error;
    return path;
  };

  const submit = async () => {
    if (!user) return;
    const parsed = inputSchema.safeParse({ legal_name: legalName, username });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    if (!idFile || !selfieFile) {
      toast.error('Please upload both your government ID and a selfie.');
      return;
    }
    if (idFile.size > 10 * 1024 * 1024 || selfieFile.size > 10 * 1024 * 1024) {
      toast.error('Each file must be under 10MB.');
      return;
    }

    setSubmitting(true);
    try {
      const [idPath, selfiePath] = await Promise.all([
        uploadFile(idFile, 'id'),
        uploadFile(selfieFile, 'selfie'),
      ]);

      const { error } = await supabase.from('verification_requests').insert({
        user_id: user.id,
        legal_name: parsed.data.legal_name,
        username: parsed.data.username,
        id_document_path: idPath,
        selfie_path: selfiePath,
      });
      if (error) throw error;

      toast.success('Verification request submitted. We will review it shortly.');
      navigate('/profile');
    } catch (err) {
      console.error(err);
      toast.error('Could not submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="loading-dots"><span /><span /><span /></div>
      </div>
    );
  }

  return (
    <div className="page-container bg-background">
      <header className="buna-header px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2"><ArrowLeft size={24} /></button>
        <h1 className="font-semibold text-lg">Buna Sini Verification</h1>
      </header>

      <div className="p-4 space-y-4">
        <div className="buna-card p-5 flex items-start gap-3">
          <VerifiedBadge size={28} />
          <div className="text-sm text-muted-foreground">
            Buna Sini Verified confirms your real identity so others know you're the account owner.
            Your documents are kept private and only reviewed by BunaChat admins.
          </div>
        </div>

        {existing && existing.status === 'pending' && (
          <div className="buna-card p-5 flex items-start gap-3">
            <Clock size={22} className="text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Review in progress</p>
              <p className="text-sm text-muted-foreground">
                Submitted {new Date(existing.created_at).toLocaleString()}. You'll be notified when a decision is made.
              </p>
            </div>
          </div>
        )}

        {existing && existing.status === 'approved' && (
          <div className="buna-card p-5 flex items-start gap-3">
            <CheckCircle2 size={22} className="text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">You're verified</p>
              <p className="text-sm text-muted-foreground">Your Buna Sini badge is active across the app.</p>
            </div>
          </div>
        )}

        {existing && existing.status === 'rejected' && (
          <div className="buna-card p-5 flex items-start gap-3">
            <XCircle size={22} className="text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Previous request rejected</p>
              {existing.review_notes && (
                <p className="text-sm text-muted-foreground mt-1">{existing.review_notes}</p>
              )}
              <p className="text-sm text-muted-foreground mt-1">You can submit a new request below.</p>
            </div>
          </div>
        )}

        {(!existing || existing.status !== 'pending') && (
          <div className="buna-card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck size={20} className="text-primary" />
              <h2 className="font-semibold">Submit for review</h2>
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">Full legal name</label>
              <input
                type="text"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                className="input-buna"
                maxLength={120}
                placeholder="As it appears on your ID"
              />
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-buna"
                maxLength={60}
                placeholder="Your public username on BunaChat"
              />
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">Government-issued ID</label>
              <label className="flex items-center gap-2 px-4 py-3 bg-muted rounded-xl cursor-pointer hover:bg-muted/80">
                <Upload size={18} />
                <span className="text-sm">{idFile ? idFile.name : 'Upload ID photo'}</span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => setIdFile(e.target.files?.[0] || null)}
                />
              </label>
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">Selfie holding your ID</label>
              <label className="flex items-center gap-2 px-4 py-3 bg-muted rounded-xl cursor-pointer hover:bg-muted/80">
                <Upload size={18} />
                <span className="text-sm">{selfieFile ? selfieFile.name : 'Upload selfie'}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setSelfieFile(e.target.files?.[0] || null)}
                />
              </label>
            </div>

            <Button onClick={submit} disabled={submitting} className="w-full">
              {submitting ? 'Submitting…' : 'Submit for review'}
            </Button>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default VerificationRequestPage;
