import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp, t } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import BottomNav from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Plus, Users, Image, ArrowLeft, UserPlus } from 'lucide-react';

interface Room {
  id: string;
  name: string;
  image_url: string | null;
  created_at: string;
  member_count: number;
}

const BunaRoomsPage = () => {
  const navigate = useNavigate();
  const { user, language } = useApp();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [roomImage, setRoomImage] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    const { data, error } = await supabase
      .from('buna_rooms')
      .select('id, name, image_url, created_at')
      .order('created_at', { ascending: false });

    if (error || !data) return;

    const { data: counts } = await (supabase as any).rpc('room_member_counts');
    const countMap = new Map<string, number>();
    (counts || []).forEach((row: { room_id: string; member_count: number }) => {
      countMap.set(row.room_id, row.member_count);
    });

    setRooms(data.map((r) => ({ ...r, member_count: countMap.get(r.id) ?? 0 })));
  };

  const handleCreateRoom = async () => {
    if (!roomName.trim() || !user) return;

    setCreating(true);
    try {
      let imageUrl = null;

      if (roomImage) {
        const fileExt = roomImage.name.split('.').pop();
        const fileName = `room-${user.id}-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('rooms')
          .upload(fileName, roomImage);

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('rooms')
            .getPublicUrl(fileName);
          imageUrl = urlData.publicUrl;
        }
      }

      const { data: roomData, error: roomError } = await supabase
        .from('buna_rooms')
        .insert({
          name: roomName.trim(),
          image_url: imageUrl,
          created_by: user.id,
        })
        .select()
        .single();

      if (roomError) throw roomError;

      // Auto-join creator to the room
      await supabase.from('room_members').insert({
        room_id: roomData.id,
        user_id: user.id,
      });

      toast.success('Room created successfully!');
      setRoomName('');
      setRoomImage(null);
      setShowCreateModal(false);
      fetchRooms();
    } catch (err) {
      toast.error('Failed to create room');
    } finally {
      setCreating(false);
    }
  };

  const handleJoinRoom = async (roomId: string) => {
    if (!user) return;

    try {
      await supabase.from('room_members').insert({
        room_id: roomId,
        user_id: user.id,
      });
      toast.success('Joined room!');
      fetchRooms();
    } catch (err) {
      toast.error('Failed to join room');
    }
  };

  return (
    <div className="page-container bg-background">
      {/* Header */}
      <header className="buna-header px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2">
          <ArrowLeft size={24} />
        </button>
        <h1 className="font-semibold text-lg">{t('bunaRooms', language)}</h1>
      </header>

      {/* Open Group Button */}
      <div className="p-4">
        <Button
          onClick={() => setShowCreateModal(true)}
          className="w-full py-6 rounded-xl flex items-center justify-center gap-2"
        >
          <Plus size={24} />
          {t('openGroup', language)}
        </Button>
      </div>

      {/* Rooms List */}
      <div className="px-4 space-y-4">
        {rooms.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <span className="text-4xl mb-4 block">☕️</span>
            <p>No Buna Rooms yet</p>
            <p className="text-sm">Create one to start a conversation!</p>
          </div>
        ) : (
          rooms.map((room) => (
            <div
              key={room.id}
              className="buna-card p-4 flex items-center gap-4"
            >
              <button
                onClick={() => navigate(`/room/${room.id}`)}
                className="flex items-center gap-4 flex-1"
              >
                <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center overflow-hidden">
                  {room.image_url ? (
                    <img src={room.image_url} alt={room.name} className="w-full h-full object-cover" />
                  ) : (
                    <Users size={28} className="text-primary" />
                  )}
                </div>
                
                <div className="text-left">
                  <h3 className="font-semibold">{room.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {room.member_count} members
                  </p>
                </div>
              </button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => handleJoinRoom(room.id)}
                className="gap-2"
              >
                <UserPlus size={16} />
                Join
              </Button>
            </div>
          ))
        )}
      </div>

      {/* Create Room Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center">
          <div className="bg-card w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 slide-up max-h-[85vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">{t('createRoom', language)}</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">{t('roomName', language)}</label>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="Enter room name"
                  className="input-buna"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Room Picture</label>
                <label className="flex items-center gap-2 px-4 py-3 bg-muted rounded-xl cursor-pointer hover:bg-muted/80">
                  <Image size={20} />
                  <span className="text-sm">
                    {roomImage ? roomImage.name : 'Choose a picture'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setRoomImage(e.target.files?.[0] || null)}
                  />
                </label>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleCreateRoom}
                disabled={creating || !roomName.trim()}
              >
                {creating ? 'Creating...' : 'Create'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default BunaRoomsPage;
