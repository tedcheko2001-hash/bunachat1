import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Video, VideoOff, SwitchCamera, Volume2, VolumeX, PhoneOff, Phone } from 'lucide-react';
import type { CallState } from '@/contexts/CallContext';

/** Simple jebena (Ethiopian coffee pot) silhouette */
export const JebenaIcon = ({ size = 24, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="currentColor" className={className} aria-hidden="true">
    <path d="M31 4c-1.6 0-3 1.3-3 3v3.6c-1.5.4-2.6 1.7-2.6 3.3 0 1.2.6 2.2 1.5 2.8-6.2 3.6-10.4 10-10.4 17.6C16.5 46 24 56 33.5 60c.7.3 1.5.3 2.2 0C45.2 56 52.7 46 52.7 34.3c0-4.4-1.4-8.5-3.8-11.9l7.5-6.2a2 2 0 0 0-2.6-3l-7.8 6.5a20.6 20.6 0 0 0-7.4-4c.9-.6 1.5-1.6 1.5-2.8 0-1.6-1.1-2.9-2.6-3.3V7c0-1.7-1.4-3-3-3h-3.5Zm3.6 15.6c8 0 14.1 6.6 14.1 14.7C48.7 43.8 42.3 52 34.6 55.6 26.9 52 20.5 43.8 20.5 34.3c0-8.1 6.1-14.7 14.1-14.7Z" />
    <path d="M24 60h22a2 2 0 0 1 0 4H24a2 2 0 0 1 0-4Z" />
  </svg>
);

interface Props {
  call: CallState;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  onAccept: () => void;
  onDecline: () => void;
  onEnd: () => void;
}

const statusText = (call: CallState) => {
  switch (call.status) {
    case 'calling':
      return 'Ringing…';
    case 'incoming':
      return call.video ? 'Incoming video call' : 'Incoming call';
    case 'connecting':
      return 'Connecting…';
    case 'active':
      return 'Connected';
    default:
      return 'Call ended';
  }
};

const CallOverlay = ({ call, localStream, remoteStream, onAccept, onDecline, onEnd }: Props) => {
  const localRef = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(call.video);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (localRef.current && localStream) localRef.current.srcObject = localStream;
  }, [localStream]);

  useEffect(() => {
    if (remoteRef.current && remoteStream) remoteRef.current.srcObject = remoteStream;
    if (audioRef.current && remoteStream) audioRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  useEffect(() => {
    if (call.status !== 'active') return;
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [call.status]);

  const toggleMic = () => {
    setMicOn((v) => {
      const next = !v;
      localStream?.getAudioTracks().forEach((t) => (t.enabled = next));
      return next;
    });
  };

  const toggleCam = () => {
    setCamOn((v) => {
      const next = !v;
      localStream?.getVideoTracks().forEach((t) => (t.enabled = next));
      return next;
    });
  };

  const toggleSpeaker = () => {
    setSpeakerOn((v) => {
      const next = !v;
      if (audioRef.current) audioRef.current.muted = !next;
      if (remoteRef.current) remoteRef.current.muted = !next;
      return next;
    });
  };

  const flipCamera = async () => {
    const track = localStream?.getVideoTracks()[0];
    if (!track) return;
    const current = track.getSettings().facingMode;
    try {
      await track.applyConstraints({ facingMode: current === 'environment' ? 'user' : 'environment' } as any);
    } catch {
      /* device may not support flipping */
    }
  };

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const mmss = fmt(seconds);
  const ended = call.status === 'ended';
  const showRemoteVideo = call.video && !!remoteStream && !ended;
  const endedTitle =
    call.endReason === 'declined'
      ? 'Call declined'
      : call.endReason === 'missed'
        ? 'Call not answered'
        : call.endReason === 'failed'
          ? 'Call failed'
          : 'Call ended';


  return (
    <div className="fixed inset-0 z-[120] flex flex-col bg-[hsl(var(--coffee-dark,20_40%_8%))] text-white">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#2a140a] via-[#140a05] to-black" />
      {showRemoteVideo && (
        <video ref={remoteRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
      )}
      <audio ref={audioRef} autoPlay className="hidden" />

      {/* Tricolor state strip */}
      <div className="relative z-10 h-1 w-full flex">
        <span className={`flex-1 ${call.status === 'active' ? 'bg-[hsl(var(--buna-green))]' : 'bg-white/10'}`} />
        <span
          className={`flex-1 ${
            call.status === 'calling' || call.status === 'incoming' || call.status === 'connecting'
              ? 'bg-[hsl(var(--buna-gold))] animate-pulse'
              : 'bg-white/10'
          }`}
        />
        <span className={`flex-1 ${call.status === 'ended' ? 'bg-[hsl(var(--buna-red))]' : 'bg-white/10'}`} />
      </div>

      {/* Peer info */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
        {!showRemoteVideo && (
          <div className="relative">
            <span className="absolute inset-0 rounded-full bg-[hsl(var(--buna-gold))]/25 animate-ping" />
            <span className="absolute -inset-3 rounded-full border border-[hsl(var(--buna-gold))]/30 jebena-pulse" />
            <div className="relative w-32 h-32 rounded-full overflow-hidden bg-white/10 flex items-center justify-center border-2 border-[hsl(var(--buna-gold))]/60">
              {call.peerAvatar ? (
                <img src={call.peerAvatar} alt={call.peerName} className="w-full h-full object-cover" />
              ) : (
                <JebenaIcon size={56} className="text-[hsl(var(--buna-gold))]" />
              )}
            </div>
            <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-black/60 backdrop-blur flex items-center justify-center border border-white/10">
              <JebenaIcon size={20} className="text-[hsl(var(--buna-gold))] jebena-pulse" />
            </div>
          </div>
        )}

        <div className={showRemoteVideo ? 'absolute top-4 left-4 text-left' : ''}>
          <h2 className="text-2xl font-semibold drop-shadow">{call.peerName}</h2>
          <p className="text-sm text-white/70 mt-1">
            {call.status === 'active' ? mmss : statusText(call)}
          </p>
        </div>

        {/* Local preview */}
        {call.video && localStream && (
          <video
            ref={localRef}
            autoPlay
            playsInline
            muted
            className="absolute bottom-40 right-4 w-28 h-40 rounded-2xl object-cover border border-white/20 shadow-xl scale-x-[-1]"
          />
        )}
      </div>

      {/* Controls */}
      <div className="relative z-10 pb-10 px-6">
        {call.status === 'incoming' ? (
          <div className="flex items-center justify-around">
            <button
              onClick={onDecline}
              className="flex flex-col items-center gap-2"
              aria-label="Decline call"
            >
              <span className="w-16 h-16 rounded-full bg-[hsl(var(--buna-red))] flex items-center justify-center shadow-lg">
                <PhoneOff size={26} />
              </span>
              <span className="text-xs">Decline</span>
            </button>
            <button onClick={onAccept} className="flex flex-col items-center gap-2" aria-label="Accept call">
              <span className="w-16 h-16 rounded-full bg-[hsl(var(--buna-green))] flex items-center justify-center shadow-lg jebena-pulse">
                <JebenaIcon size={28} />
              </span>
              <span className="text-xs">Accept</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={toggleMic}
              className={`w-12 h-12 rounded-full flex items-center justify-center backdrop-blur ${micOn ? 'bg-white/10' : 'bg-[hsl(var(--buna-red))]'}`}
              aria-label="Toggle microphone"
            >
              {micOn ? <Mic size={20} /> : <MicOff size={20} />}
            </button>
            <button
              onClick={toggleSpeaker}
              className={`w-12 h-12 rounded-full flex items-center justify-center backdrop-blur ${speakerOn ? 'bg-white/10' : 'bg-white/25'}`}
              aria-label="Toggle speaker"
            >
              {speakerOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </button>
            {call.video && (
              <>
                <button
                  onClick={toggleCam}
                  className={`w-12 h-12 rounded-full flex items-center justify-center backdrop-blur ${camOn ? 'bg-white/10' : 'bg-[hsl(var(--buna-red))]'}`}
                  aria-label="Toggle camera"
                >
                  {camOn ? <Video size={20} /> : <VideoOff size={20} />}
                </button>
                <button
                  onClick={flipCamera}
                  className="w-12 h-12 rounded-full bg-white/10 backdrop-blur flex items-center justify-center"
                  aria-label="Flip camera"
                >
                  <SwitchCamera size={20} />
                </button>
              </>
            )}
            <button
              onClick={onEnd}
              className="w-16 h-12 rounded-full bg-[hsl(var(--buna-red))] flex items-center justify-center shadow-lg"
              aria-label="End call"
            >
              <PhoneOff size={22} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export const CallButtonIcon = Phone;
export default CallOverlay;
