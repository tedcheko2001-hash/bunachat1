import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle2, XCircle, ImageIcon } from 'lucide-react';

interface Request {
  id: string;
  user_id: string;
  legal_name: string;
  username: string;
  id_document_path: string;
  selfie_path: string;
  status: 'pending' | 'approved' | 'rejected';
  review_notes: string | null;
  created_at: string;
}

const AdminVerificationsPage = () => {
  const navigate = useNavigate();
  const { user } = useApp();
  const [checked, setChecked] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [rows, setRows] = useState<Request[]>([]);
  const [urls, setUrls] = useState<Record<string, { id: string; selfie: string }>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const { data } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      setAllowed(!!data);
      setChecked(true);
      if (data) await load();
    })();
  }, [user]);

  const load = async () => {
    const { data, error } = await supabase
      .from('verification_requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      toast.error('Failed to load requests');
      return;
    }
    setRows((data as Request[]) || []);

    // sign URLs for all files
    const map: Record<string, { id: string; selfie: string }> = {};
    await Promise.all(
      (data || []).map(async (r: Request) => {
        const [idRes, selfieRes] = await Promise.all([
          supabase.storage.from('verifications').createSignedUrl(r.id_document_path, 60 * 60),
          supabase.storage.from('verifications').createSignedUrl(r.selfie_path, 60 * 60),
        ]);
        map[r.id] = {
          id: idRes.data?.signedUrl || '',
          selfie: selfieRes.data?.signedUrl || '',
        };
      }),
    );
    setUrls(map);
  };

  const decide = async (row: Request, status: 'approved' | 'rejected') => {
    const { error } = await supabase
      .from('verification_requests')
      .update({
        status,
        review_notes: notes[row.id] || null,
        reviewer_id: user?.id || null,
      })
      .eq('id', row.id);
    if (error) {
      toast.error('Update failed');
      return;
    }
    toast.success(`Request ${status}`);
    await load();
  };

  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="loading-dots"><span /><span /><span /></div>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="page-container bg-background">
        <header className="buna-header px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2"><ArrowLeft size={24} /></button>
          <h1 className="font-semibold text-lg">Verification review</h1>
        </header>
        <p className="text-muted-foreground text-center mt-12">Admins only.</p>
      </div>
    );
  }

  return (
    <div className="page-container bg-background">
      <header className="buna-header px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2"><ArrowLeft size={24} /></button>
        <h1 className="font-semibold text-lg">Verification review</h1>
      </header>

      <div className="p-4 space-y-4">
        {rows.length === 0 && (
          <p className="text-muted-foreground text-center mt-8">No verification requests yet.</p>
        )}
        {rows.map((row) => (
          <div key={row.id} className="buna-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{row.legal_name}</p>
                <p className="text-sm text-muted-foreground">@{row.username}</p>
              </div>
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  row.status === 'approved'
                    ? 'bg-primary/10 text-primary'
                    : row.status === 'rejected'
                    ? 'bg-destructive/10 text-destructive'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {row.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {(['id', 'selfie'] as const).map((k) => (
                <a
                  key={k}
                  href={urls[row.id]?.[k]}
                  target="_blank"
                  rel="noreferrer"
                  className="aspect-video bg-muted rounded-xl overflow-hidden flex items-center justify-center"
                >
                  {urls[row.id]?.[k] ? (
                    <img src={urls[row.id][k]} alt={k} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon size={24} className="text-muted-foreground" />
                  )}
                </a>
              ))}
            </div>

            <textarea
              value={notes[row.id] ?? row.review_notes ?? ''}
              onChange={(e) => setNotes((n) => ({ ...n, [row.id]: e.target.value }))}
              placeholder="Review notes (optional, shown to user if rejected)"
              className="input-buna min-h-16 resize-none text-sm"
            />

            {row.status === 'pending' && (
              <div className="flex gap-2">
                <Button className="flex-1 gap-2" onClick={() => decide(row, 'approved')}>
                  <CheckCircle2 size={18} /> Approve
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1 gap-2"
                  onClick={() => decide(row, 'rejected')}
                >
                  <XCircle size={18} /> Reject
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminVerificationsPage;
