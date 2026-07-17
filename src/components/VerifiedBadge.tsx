import { useState } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface VerifiedBadgeProps {
  size?: number;
  className?: string;
}

const TOOLTIP_TEXT =
  "Buna Sini Verified — This account has completed BunaChat's identity verification process. It confirms the identity of the account owner and helps prevent impersonation. It does not imply endorsement by BunaChat.";

const VerifiedBadge = ({ size = 16, className = '' }: VerifiedBadgeProps) => {
  const [pressed, setPressed] = useState(false);

  const iconSize = Math.round(size * 0.62);

  const badge = (
    <span
      role="img"
      aria-label="Buna Sini Verified"
      className={`verified-badge verified-badge-appear ${className}`}
      style={{ width: size, height: size }}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Minimalist Ethiopian coffee cup (Sini) icon */}
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M5 8h13v6a5 5 0 0 1-5 5h-3a5 5 0 0 1-5-5V8z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M18 10h1.5a2.5 2.5 0 0 1 0 5H18"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M8 3.5c0 1 1 1 1 2s-1 1-1 2M12 3.5c0 1 1 1 1 2s-1 1-1 2"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );

  return (
    <Tooltip open={pressed || undefined}>
      <TooltipTrigger asChild>{badge}</TooltipTrigger>
      <TooltipContent className="max-w-xs text-xs">
        {TOOLTIP_TEXT}
      </TooltipContent>
    </Tooltip>
  );
};

export default VerifiedBadge;
