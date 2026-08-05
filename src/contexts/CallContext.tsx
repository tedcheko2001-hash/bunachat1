import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';
import CallOverlay from '@/components/CallOverlay';
import { toast } from 'sonner';

export type CallStatus = 'idle' | 'calling' | 'incoming' | 'connecting' | 'active' | 'ended';

export interface CallState {
  peerId: string;
  peerName: string;
  peerAvatar: string | null;
  video: boolean;
  role: 'caller' | 'callee';
  status: CallStatus;
  /** seconds the call lasted — only set once status is 'ended' */
  duration?: number;
  endReason?: 'answered' | 'declined' | 'missed' | 'failed';
}


interface CallContextValue {
  call: CallState | null;
  startCall: (peerId: string, video: boolean, peerName?: string, peerAvatar?: string | null) => Promise<void>;
}

const CallContext = createContext<CallContextValue>({
  call: null,
  startCall: async () => {},
});

export const useCall = () => useContext(CallContext);

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export const CallProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useApp();
  const [call, setCall] = useState<CallState | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const peerChanRef = useRef<any>(null);
  const pendingOfferRef = useRef<{ sdp: any; video: boolean } | null>(null);
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const ringRef = useRef<{ ctx: AudioContext; timer: number } | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const endTimerRef = useRef<number | null>(null);

  /* ---------------- ringtone / vibration ---------------- */
  const startRing = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const beep = () => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 620;
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.65);
        navigator.vibrate?.([300, 200]);
      };
      beep();
      const timer = window.setInterval(beep, 1600);
      ringRef.current = { ctx, timer };
    } catch {
      /* audio not available */
    }
  }, []);

  const stopRing = useCallback(() => {
    if (ringRef.current) {
      clearInterval(ringRef.current.timer);
      void ringRef.current.ctx.close().catch(() => {});
      ringRef.current = null;
    }
    navigator.vibrate?.(0);
  }, []);

  /* ---------------- signalling helpers ---------------- */
  const openPeerChannel = useCallback(async (peerId: string) => {
    if (peerChanRef.current) return peerChanRef.current;
    const chan = supabase.channel(`calls:${peerId}`, { config: { broadcast: { self: false } } });
    await new Promise<void>((resolve) => {
      chan.subscribe((status: string) => {
        if (status === 'SUBSCRIBED') resolve();
      });
    });
    peerChanRef.current = chan;
    return chan;
  }, []);

  const signal = useCallback(
    async (peerId: string, event: string, payload: Record<string, unknown>) => {
      const chan = await openPeerChannel(peerId);
      await chan.send({ type: 'broadcast', event, payload: { ...payload, from: user?.id } });
    },
    [openPeerChannel, user?.id],
  );

  /* ---------------- teardown ---------------- */
  const cleanup = useCallback(() => {
    stopRing();
    pcRef.current?.getSenders().forEach((s) => s.track?.stop());
    pcRef.current?.close();
    pcRef.current = null;
    setLocalStream((s) => {
      s?.getTracks().forEach((t) => t.stop());
      return null;
    });
    setRemoteStream(null);
    pendingOfferRef.current = null;
    pendingIceRef.current = [];
    if (peerChanRef.current) {
      supabase.removeChannel(peerChanRef.current);
      peerChanRef.current = null;
    }
  }, [stopRing]);

  /** Finish a call: stop media, log history, show the "Call ended" screen briefly. */
  const finishCall = useCallback(
    (reason: 'answered' | 'declined' | 'missed' | 'failed') => {
      const started = startedAtRef.current;
      const duration = started ? Math.round((Date.now() - started) / 1000) : 0;
      startedAtRef.current = null;
      cleanup();
      setCall((c) => {
        if (!c) return null;
        // only one side writes the history row to avoid duplicates
        if (user && c.role === 'caller') {
          void (supabase as any).from('call_history').insert({
            caller_id: user.id,
            callee_id: c.peerId,
            video: c.video,
            duration_seconds: duration,
            status: reason,
          });
        }
        return { ...c, status: 'ended', duration, endReason: reason };
      });
      if (endTimerRef.current) clearTimeout(endTimerRef.current);
      endTimerRef.current = window.setTimeout(() => {
        setCall(null);
        endTimerRef.current = null;
      }, 2500);
    },
    [cleanup, user],
  );

  const endCall = useCallback(
    async (notify = true) => {
      const peerId = call?.peerId;
      const wasActive = call?.status === 'active' || !!startedAtRef.current;
      if (notify && peerId) {
        try {
          await signal(peerId, 'call-end', {});
        } catch {
          /* ignore */
        }
      }
      finishCall(wasActive ? 'answered' : 'missed');
    },
    [call?.peerId, call?.status, signal, finishCall],
  );


  /* ---------------- peer connection ---------------- */
  const createPc = useCallback(
    (peerId: string) => {
      const pc = new RTCPeerConnection(ICE_SERVERS);
      pc.onicecandidate = (e) => {
        if (e.candidate) void signal(peerId, 'call-ice', { candidate: e.candidate.toJSON() });
      };
      pc.ontrack = (e) => {
        setRemoteStream(e.streams[0]);
        if (!startedAtRef.current) startedAtRef.current = Date.now();
        setCall((c) => (c ? { ...c, status: 'active' } : c));
      };
      pc.onconnectionstatechange = () => {
        console.log('[call] connection state:', pc.connectionState);
        if (pc.connectionState === 'connected') {
          if (!startedAtRef.current) startedAtRef.current = Date.now();
          setCall((c) => (c ? { ...c, status: 'active' } : c));
        }
        if (pc.connectionState === 'failed') {
          finishCall('failed');
        }
      };

      pcRef.current = pc;
      return pc;
    },
    [signal, finishCall],
  );

  const getMedia = async (video: boolean) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: video ? { facingMode: 'user' } : false,
    });
    setLocalStream(stream);
    return stream;
  };

  /* ---------------- outgoing ---------------- */
  const startCall = useCallback(
    async (peerId: string, video: boolean, peerName?: string, peerAvatar?: string | null) => {
      if (!user || (call && call.status !== 'ended')) return;
      if (endTimerRef.current) {
        clearTimeout(endTimerRef.current);
        endTimerRef.current = null;
      }
      startedAtRef.current = null;
      let name = peerName;
      let avatar = peerAvatar ?? null;
      if (!name) {
        const { data } = await (supabase as any)
          .from('profiles_public')
          .select('name, avatar_url')
          .eq('user_id', peerId)
          .maybeSingle();
        name = data?.name || 'Buna member';
        avatar = data?.avatar_url ?? null;
      }
      setCall({ peerId, peerName: name || 'Buna member', peerAvatar: avatar, video, role: 'caller', status: 'calling' });

      try {
        const stream = await getMedia(video);
        const pc = createPc(peerId);
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));
        const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: video });
        await pc.setLocalDescription(offer);

        const { data: me } = await supabase
          .from('profiles')
          .select('name, avatar_url')
          .eq('user_id', user.id)
          .maybeSingle();

        await signal(peerId, 'call-offer', {
          sdp: pc.localDescription,
          video,
          fromName: me?.name || 'Someone',
          fromAvatar: me?.avatar_url || null,
        });
      } catch (e: any) {
        toast.error(e?.name === 'NotAllowedError' ? 'Microphone/camera permission denied' : 'Could not start call');
        cleanup();
        setCall(null);
      }
    },
    [user, call, createPc, signal, cleanup],
  );

  /* ---------------- answer / decline ---------------- */
  const acceptCall = useCallback(async () => {
    if (!call || !pendingOfferRef.current) return;
    stopRing();
    setCall({ ...call, status: 'connecting' });
    try {
      const { sdp, video } = pendingOfferRef.current;
      const stream = await getMedia(video);
      const pc = createPc(call.peerId);
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      for (const c of pendingIceRef.current) {
        await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
      }
      pendingIceRef.current = [];
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await signal(call.peerId, 'call-answer', { sdp: pc.localDescription });
    } catch (e: any) {
      toast.error(e?.name === 'NotAllowedError' ? 'Microphone/camera permission denied' : 'Could not join call');
      void endCall();
    }
  }, [call, createPc, signal, stopRing, endCall]);

  const declineCall = useCallback(async () => {
    stopRing();
    if (call) {
      try {
        await signal(call.peerId, 'call-decline', {});
      } catch {
        /* ignore */
      }
    }
    finishCall('declined');
  }, [call, signal, stopRing, finishCall]);


  /* ---------------- inbound signalling ---------------- */
  useEffect(() => {
    if (!user) return;
    const chan = supabase
      .channel(`calls:${user.id}`, { config: { broadcast: { self: false } } })
      .on('broadcast', { event: 'call-offer' }, async ({ payload }: any) => {
        if (pcRef.current || call) {
          // busy — auto-decline
          try {
            const tmp = supabase.channel(`calls:${payload.from}`);
            await new Promise<void>((r) => tmp.subscribe((s: string) => s === 'SUBSCRIBED' && r()));
            await tmp.send({ type: 'broadcast', event: 'call-decline', payload: { from: user.id } });
            supabase.removeChannel(tmp);
          } catch {
            /* ignore */
          }
          return;
        }
        pendingOfferRef.current = { sdp: payload.sdp, video: !!payload.video };
        setCall({
          peerId: payload.from,
          peerName: payload.fromName || 'Someone',
          peerAvatar: payload.fromAvatar || null,
          video: !!payload.video,
          role: 'callee',
          status: 'incoming',
        });
        startRing();
      })
      .on('broadcast', { event: 'call-answer' }, async ({ payload }: any) => {
        if (!pcRef.current) return;
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload.sdp)).catch(() => {});
        for (const c of pendingIceRef.current) {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
        }
        pendingIceRef.current = [];
        setCall((c) => (c ? { ...c, status: 'connecting' } : c));
      })
      .on('broadcast', { event: 'call-ice' }, async ({ payload }: any) => {
        const pc = pcRef.current;
        if (!pc || !pc.remoteDescription) {
          pendingIceRef.current.push(payload.candidate);
          return;
        }
        await pc.addIceCandidate(new RTCIceCandidate(payload.candidate)).catch(() => {});
      })
      .on('broadcast', { event: 'call-decline' }, () => {
        toast('Call declined');
        finishCall('declined');
      })
      .on('broadcast', { event: 'call-end' }, () => {
        finishCall(startedAtRef.current ? 'answered' : 'missed');
      })

      .subscribe();

    return () => {
      supabase.removeChannel(chan);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, call?.peerId, call?.status]);

  useEffect(() => () => cleanup(), [cleanup]);

  return (
    <CallContext.Provider value={{ call, startCall }}>
      {children}
      {call && (
        <CallOverlay
          call={call}
          localStream={localStream}
          remoteStream={remoteStream}
          onAccept={acceptCall}
          onDecline={declineCall}
          onEnd={() => void endCall()}
        />
      )}
    </CallContext.Provider>
  );
};
