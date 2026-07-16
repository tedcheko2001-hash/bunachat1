import { useState, useRef } from 'react';
import { Heart } from 'lucide-react';

export type ReactionType = 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry';

export const REACTIONS: { type: ReactionType; emoji: string; label: string; color: string }[] = [
  { type: 'like',  emoji: '👍', label: 'Like',  color: 'text-blue-500' },
  { type: 'love',  emoji: '❤️', label: 'Love',  color: 'text-red-500' },
  { type: 'haha',  emoji: '😂', label: 'Haha',  color: 'text-yellow-500' },
  { type: 'wow',   emoji: '😮', label: 'Wow',   color: 'text-yellow-500' },
  { type: 'sad',   emoji: '😢', label: 'Sad',   color: 'text-yellow-500' },
  { type: 'angry', emoji: '😡', label: 'Angry', color: 'text-orange-500' },
];

export const getReaction = (type: ReactionType | null | undefined) =>
  REACTIONS.find(r => r.type === type) || REACTIONS[0];

interface ReactionPickerProps {
  currentReaction: ReactionType | null;
  count: number;
  onReact: (type: ReactionType | null) => void;
}

const HOLD_MS = 350;

const ReactionPicker = ({ currentReaction, count, onReact }: ReactionPickerProps) => {
  const [open, setOpen] = useState(false);
  const timerRef = useRef<number | null>(null);
  const heldRef = useRef(false);

  const current = currentReaction ? getReaction(currentReaction) : null;

  const startHold = () => {
    heldRef.current = false;
    timerRef.current = window.setTimeout(() => {
      heldRef.current = true;
      setOpen(true);
    }, HOLD_MS);
  };
  const cancelHold = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
  };
  const handleClick = () => {
    if (heldRef.current) return; // was a long-press
    // Simple click = toggle 'like'
    onReact(currentReaction ? null : 'like');
  };
  const pick = (type: ReactionType) => {
    setOpen(false);
    onReact(type);
  };

  return (
    <div className="relative inline-flex" onMouseLeave={() => setOpen(false)}>
      <button
        onMouseEnter={() => setOpen(true)}
        onMouseDown={startHold}
        onMouseUp={cancelHold}
        onTouchStart={startHold}
        onTouchEnd={cancelHold}
        onClick={handleClick}
        className={`flex items-center gap-2 transition-colors ${
          current ? current.color : 'text-muted-foreground hover:text-primary'
        }`}
        aria-label="React"
      >
        {current ? (
          <span className="text-lg leading-none">{current.emoji}</span>
        ) : (
          <Heart size={18} />
        )}
        <span className="text-sm">{count}</span>
      </button>

      {open && (
        <div
          className="absolute bottom-full left-0 mb-2 bg-card border border-border rounded-full shadow-lg px-2 py-1.5 flex gap-1 z-20 badge-pop"
          onMouseEnter={() => setOpen(true)}
        >
          {REACTIONS.map(r => (
            <button
              key={r.type}
              onClick={() => pick(r.type)}
              className={`text-2xl leading-none p-1 rounded-full transition-transform hover:scale-125 ${
                currentReaction === r.type ? 'scale-110' : ''
              }`}
              aria-label={r.label}
              title={r.label}
            >
              {r.emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReactionPicker;
