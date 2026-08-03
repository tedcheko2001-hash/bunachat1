import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Radio,
  Mic,
  MicOff,
  Video,
  VideoOff,
  SwitchCamera,
  X,
  Send,
  Coffee,
  Users,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ChatMsg {
  id: string;
  name: string;
  content: string;
}

interface Props {
  ceremonyId: string;
  selfId: string;
  isHost: boolean;
  title: string;
  hostName?: string;
  viewerCount: number;
  currentUserName: string;
  onEnd: () => void; // host ending / viewer leaving
  onSendMessage?: (text: string) => Promise<void> | void;
  liveMessages?: ChatMsg[];
}

type PermState = 'idle' | 'requesting' | 'granted' | 'denied';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

const LiveCeremonyView = ({
  ceremonyId,
  selfId,
  isHost,
  title,
  hostName,
  viewerCount,
  currentUserName,
  onEnd,
  onSendMessage,
  liveMessages = [],
}: Props) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<any>(null);
  const hostPeersRef = useRef<Record<string, RTCPeerConnection>>({});
  const viewerPcRef = useRef<RTCPeerConnection | null>(null);
  const pendingIceRef = useRef<Record<string, RTCIceCandidateInit[]>>({});

  const [facing, setFacing] = useState<'user' | 'environment'>('user');
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [perm, setPerm] = useState<PermState>(isHost ? 'idle' : 'granted');
  const [errMsg, setErrMsg] = useState<string>('');
  const [chatDraft, setChatDraft] = useState('');
  const [localChat, setLocalChat] = useState<ChatMsg[]>([]);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [needsUnmute, setNeedsUnmute] = useState(false);
  /** viewer-side link health */
  const [linkState, setLinkState] = useState<'connecting' | 'live' | 'reconnecting' | 'failed'>('connecting');
  const [retryCount, setRetryCount] = useState(0);

  const send = useCallback(async (event: string, payload: Record<string, unknown>) => {
    await channelRef.current?.send({ type: 'broadcast', event, payload });
  }, []);

  const stopTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    Object.values(hostPeersRef.current).forEach((pc) => pc.close());
    hostPeersRef.current = {};
    viewerPcRef.current?.close();
    viewerPcRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  /* ---------- host: create a peer connection per viewer ---------- */
  const createHostPeer = useCallback(
    async (viewerId: string) => {
      const stream = streamRef.current;
      if (!stream) return;
      const liveTracks = stream.getTracks().filter((t) => t.readyState === 'live');
      if (liveTracks.length === 0) return;
      hostPeersRef.current[viewerId]?.close();
      const pc = new RTCPeerConnection(ICE_SERVERS);
      hostPeersRef.current[viewerId] = pc;
      // add every active track BEFORE creating the offer
      liveTracks.forEach((t) => pc.addTrack(t, stream));
      pc.oniceconnectionstatechange = () => {
        console.log('[live] host ICE state', viewerId, pc.iceConnectionState);
      };
      pc.onicecandidate = (e) => {
        if (e.candidate) void send('live-ice', { to: viewerId, from: selfId, candidate: e.candidate.toJSON() });
      };
      const offer = await pc.createOffer({ offerToReceiveAudio: false, offerToReceiveVideo: false });
      await pc.setLocalDescription(offer);
      await send('live-offer', { to: viewerId, from: selfId, sdp: pc.localDescription });
    },
    [selfId, send],
  );


  /* ---------- media capture (host) ---------- */
  const startStream = useCallback(
    async (mode: 'user' | 'environment') => {
      if (!isHost) return;
      setPerm('requesting');
      setErrMsg('');
      try {
        stopTracks();
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: mode },
          audio: true,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        stream.getAudioTracks().forEach((t) => (t.enabled = micOn));
        stream.getVideoTracks().forEach((t) => (t.enabled = camOn));
        setPerm('granted');
        // tell viewers the broadcast is up so they (re)request an offer
        void send('host-ready', { from: selfId });
      } catch (e: any) {
        setPerm('denied');
        setErrMsg(e?.message || 'Camera & microphone access is required to go live.');
      }
    },
    [isHost, stopTracks, micOn, camOn, send, selfId],
  );

  /* ---------- signalling channel ---------- */
  useEffect(() => {
    const chan = supabase.channel(`ceremony:${ceremonyId}`, {
      config: { broadcast: { self: false } },
    });

    chan
      .on('broadcast', { event: 'viewer-join' }, async ({ payload }: any) => {
        if (!isHost || !streamRef.current) return;
        await createHostPeer(payload.from);
      })
      .on('broadcast', { event: 'host-ready' }, async () => {
        if (isHost) return;
        await send('viewer-join', { from: selfId });
      })
      .on('broadcast', { event: 'live-offer' }, async ({ payload }: any) => {
        if (isHost || payload.to !== selfId) return;
        viewerPcRef.current?.close();
        const pc = new RTCPeerConnection(ICE_SERVERS);
        viewerPcRef.current = pc;
        pc.ontrack = (e) => {
          const stream = e.streams[0] || new MediaStream([e.track]);
          setRemoteStream(stream);
          setLinkState('live');
        };
        pc.oniceconnectionstatechange = () => {
          console.log('[live] viewer ICE state:', pc.iceConnectionState);
          if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
            setLinkState('live');
          }
          if (pc.iceConnectionState === 'disconnected') {
            setLinkState('reconnecting');
          }
          if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'closed') {
            // drop the dead stream so the retry loop kicks in with a clear status
            setRemoteStream(null);
            setLinkState('reconnecting');
          }
        };
        pc.onconnectionstatechange = () => {
          console.log('[live] viewer connection state:', pc.connectionState);
          if (pc.connectionState === 'connected') setLinkState('live');
          if (pc.connectionState === 'disconnected') setLinkState('reconnecting');
          if (pc.connectionState === 'failed') {
            setRemoteStream(null);
            setLinkState('reconnecting');
          }
        };
        pc.onicecandidate = (e) => {
          if (e.candidate)
            void send('live-ice', { to: payload.from, from: selfId, candidate: e.candidate.toJSON() });
        };
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        for (const c of pendingIceRef.current[selfId] || []) {
          await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
        }
        pendingIceRef.current[selfId] = [];
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await send('live-answer', { to: payload.from, from: selfId, sdp: pc.localDescription });
      })

      .on('broadcast', { event: 'live-answer' }, async ({ payload }: any) => {
        if (!isHost || payload.to !== selfId) return;
        const pc = hostPeersRef.current[payload.from];
        if (!pc) return;
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp)).catch(() => {});
        for (const c of pendingIceRef.current[payload.from] || []) {
          await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
        }
        pendingIceRef.current[payload.from] = [];
      })
      .on('broadcast', { event: 'live-ice' }, async ({ payload }: any) => {
        if (payload.to !== selfId) return;
        const pc = isHost ? hostPeersRef.current[payload.from] : viewerPcRef.current;
        if (!pc || !pc.remoteDescription) {
          const key = isHost ? payload.from : selfId;
          pendingIceRef.current[key] = [...(pendingIceRef.current[key] || []), payload.candidate];
          return;
        }
        await pc.addIceCandidate(new RTCIceCandidate(payload.candidate)).catch(() => {});
      })
      .on('broadcast', { event: 'live-ended' }, () => {
        if (!isHost) {
          stopTracks();
          onEnd();
        }
      })
      .subscribe(async (status: string) => {
        if (status !== 'SUBSCRIBED') return;
        channelRef.current = chan;
        if (isHost) {
          await startStream(facing);
        } else {
          await send('viewer-join', { from: selfId });
        }
      });

    channelRef.current = chan;

    return () => {
      stopTracks();
      supabase.removeChannel(chan);
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ceremonyId, selfId, isHost]);

  // Attach remote stream for viewers (muted first so autoplay is never blocked)
  useEffect(() => {
    if (isHost || !remoteStream) return;
    const el = videoRef.current;
    if (!el) return;
    el.srcObject = remoteStream;
    el.muted = true;
    el.play()
      .then(async () => {
        try {
          el.muted = false;
          await el.play();
          setNeedsUnmute(false);
        } catch {
          setNeedsUnmute(true);
        }
      })
      .catch(() => setNeedsUnmute(true));
  }, [remoteStream, isHost]);

  // Viewers keep asking the host for an offer until video arrives
  useEffect(() => {
    if (isHost || remoteStream) return;
    const id = window.setInterval(() => {
      void send('viewer-join', { from: selfId });
    }, 4000);
    return () => clearInterval(id);
  }, [isHost, remoteStream, send, selfId]);


  // Clean up on page hide
  useEffect(() => {
    const onHide = () => stopTracks();
    window.addEventListener('pagehide', onHide);
    window.addEventListener('beforeunload', onHide);
    return () => {
      window.removeEventListener('pagehide', onHide);
      window.removeEventListener('beforeunload', onHide);
    };
  }, [stopTracks]);

  const toggleMic = () => {
    setMicOn((v) => {
      const next = !v;
      streamRef.current?.getAudioTracks().forEach((t) => (t.enabled = next));
      return next;
    });
  };

  const toggleCam = () => {
    setCamOn((v) => {
      const next = !v;
      streamRef.current?.getVideoTracks().forEach((t) => (t.enabled = next));
      return next;
    });
  };

  const flipCamera = async () => {
    const next = facing === 'user' ? 'environment' : 'user';
    setFacing(next);
    await startStream(next);
    // renegotiate with every viewer using the new tracks
    for (const viewerId of Object.keys(hostPeersRef.current)) {
      await createHostPeer(viewerId);
    }
  };

  const handleEnd = () => {
    if (isHost) void send('live-ended', { from: selfId });
    stopTracks();
    onEnd();
  };

  const handleSend = async () => {
    const text = chatDraft.trim();
    if (!text) return;
    setChatDraft('');
    if (onSendMessage) {
      await onSendMessage(text);
    } else {
      setLocalChat((prev) => [
        ...prev,
        { id: `${Date.now()}`, name: currentUserName, content: text },
      ]);
    }
  };

  const chat = liveMessages.length ? liveMessages : localChat;
  const showVideo = isHost ? perm === 'granted' : !!remoteStream;

  return (
    <div className="fixed inset-0 z-[100] bg-black text-white flex flex-col">
      {/* Video / placeholder */}
      <div className="absolute inset-0">
        {showVideo ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted={isHost}
              className={`w-full h-full object-cover ${
                isHost && facing === 'user' ? 'scale-x-[-1]' : ''
              }`}
            />
            {!isHost && needsUnmute && (
              <button
                onClick={() => {
                  if (videoRef.current) {
                    videoRef.current.muted = false;
                    void videoRef.current.play();
                  }
                  setNeedsUnmute(false);
                }}
                className="absolute top-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-amber-500 text-black text-sm font-semibold shadow-lg"
              >
                Tap to unmute
              </button>
            )}
          </>
        ) : isHost && perm === 'denied' ? (

          <div className="w-full h-full flex flex-col items-center justify-center px-6 text-center bg-gradient-to-b from-[#3a1f14] to-black">
            <Coffee size={56} className="mb-4 text-amber-400" />
            <h2 className="text-xl font-semibold mb-2">Camera & microphone needed</h2>
            <p className="text-sm text-white/70 max-w-sm mb-6">
              To host a live coffee ceremony we need permission to use your camera and
              microphone. {errMsg && <span className="block mt-1 text-white/50">{errMsg}</span>}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => startStream(facing)}
                className="px-4 py-2 rounded-full bg-amber-500 text-black text-sm font-semibold"
              >
                Retry
              </button>
              <button
                onClick={handleEnd}
                className="px-4 py-2 rounded-full border border-white/30 text-sm"
              >
                Cancel
              </button>
            </div>
            <p className="text-xs text-white/40 mt-4">
              If it keeps failing, open your browser settings and allow camera + mic for this
              site.
            </p>
          </div>
        ) : isHost && perm === 'requesting' ? (
          <div className="w-full h-full flex items-center justify-center bg-black">
            <p className="text-sm text-white/70">Requesting camera & mic…</p>
          </div>
        ) : (
          // Viewer: keep the video element mounted, overlay a waiting state
          <div className="w-full h-full relative bg-gradient-to-b from-[#2a140a] via-black to-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="w-24 h-24 rounded-full bg-amber-500/20 flex items-center justify-center mb-4 animate-pulse">
                <Coffee size={44} className="text-amber-400" />
              </div>
              <p className="text-lg font-semibold">{hostName || 'Host'} is live</p>
              <p className="text-sm text-white/60 mt-1">Waiting for host video… ☕</p>
            </div>
          </div>
        )}

        {/* subtle vignette */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/70" />
      </div>

      {/* Top bar */}
      <div className="relative flex items-center justify-between px-4 pt-4 z-10">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-600/90 text-xs font-bold uppercase tracking-wide shadow-lg">
            <Radio size={12} className="animate-pulse" />
            {isHost ? "You're Live" : 'Live'}
          </span>
          <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-black/50 backdrop-blur text-xs">
            <Users size={12} /> {viewerCount}
          </span>
        </div>
        <button
          onClick={handleEnd}
          className="w-9 h-9 rounded-full bg-black/50 backdrop-blur flex items-center justify-center"
          aria-label="Close"
        >
          <X size={18} />
        </button>
      </div>

      {/* Title */}
      <div className="relative z-10 px-4 mt-2">
        <p className="text-sm font-semibold drop-shadow">☕ {title}</p>
      </div>

      {/* Bottom chat + controls */}
      <div className="relative z-10 mt-auto flex flex-col gap-2 p-3 pb-6">
        <div className="max-h-40 overflow-y-auto flex flex-col gap-1 hide-scrollbar">
          {chat.slice(-30).map((m) => (
            <div key={m.id} className="text-sm">
              <span className="inline-block px-2.5 py-1 rounded-2xl bg-black/50 backdrop-blur">
                <span className="font-semibold text-amber-300">{m.name}: </span>
                <span>{m.content}</span>
              </span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 bg-black/50 backdrop-blur rounded-full px-4 py-2">
            <input
              value={chatDraft}
              onChange={(e) => setChatDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Say something…"
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-white/50"
              maxLength={200}
            />
            <button onClick={handleSend} className="text-amber-400">
              <Send size={18} />
            </button>
          </div>

          {isHost && perm === 'granted' && (
            <>
              <button
                onClick={toggleMic}
                className={`w-10 h-10 rounded-full flex items-center justify-center backdrop-blur ${
                  micOn ? 'bg-black/50' : 'bg-red-600'
                }`}
                aria-label="Toggle microphone"
              >
                {micOn ? <Mic size={18} /> : <MicOff size={18} />}
              </button>
              <button
                onClick={toggleCam}
                className={`w-10 h-10 rounded-full flex items-center justify-center backdrop-blur ${
                  camOn ? 'bg-black/50' : 'bg-red-600'
                }`}
                aria-label="Toggle camera"
              >
                {camOn ? <Video size={18} /> : <VideoOff size={18} />}
              </button>
              <button
                onClick={flipCamera}
                className="w-10 h-10 rounded-full bg-black/50 backdrop-blur flex items-center justify-center"
                aria-label="Flip camera"
              >
                <SwitchCamera size={18} />
              </button>
            </>
          )}

          <button
            onClick={handleEnd}
            className="px-4 h-10 rounded-full bg-red-600 text-white text-sm font-semibold shadow-lg"
          >
            {isHost ? 'End Live' : 'Leave'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LiveCeremonyView;
