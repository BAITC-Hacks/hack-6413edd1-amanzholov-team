import React, { useEffect, useState, useRef } from 'react';

interface MuteIndicatorOverlayProps {
  soundActive: boolean;
  onToggleSound: () => void;
}

/**
 * Pixel-art Mute Speaker Icon (16-bit Stardew aesthetic)
 */
export const PixelMuteIcon: React.FC<{ className?: string; size?: number }> = ({
  className = '',
  size = 16,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block shrink-0 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] ${className}`}
  >
    {/* Speaker cone / body */}
    <rect x="2" y="6" width="3" height="4" fill="#fae4b5" />
    <rect x="5" y="4" width="2" height="8" fill="#fae4b5" />
    <rect x="7" y="2" width="2" height="12" fill="#fae4b5" />
    {/* Shadow base */}
    <rect x="2" y="10" width="3" height="1" fill="#9c7530" />
    <rect x="5" y="12" width="2" height="1" fill="#9c7530" />
    <rect x="7" y="14" width="2" height="1" fill="#9c7530" />
    {/* Pixel red slash (mute cross-out) */}
    <rect x="1" y="2" width="2" height="2" fill="#ef4444" />
    <rect x="3" y="4" width="2" height="2" fill="#ef4444" />
    <rect x="5" y="6" width="2" height="2" fill="#ef4444" />
    <rect x="7" y="8" width="2" height="2" fill="#ef4444" />
    <rect x="9" y="10" width="2" height="2" fill="#ef4444" />
    <rect x="11" y="12" width="2" height="2" fill="#ef4444" />
    <rect x="13" y="14" width="2" height="2" fill="#ef4444" />
    {/* Dark outline on the slash for crisp contrast */}
    <rect x="2" y="1" width="2" height="1" fill="#581616" opacity="0.6" />
    <rect x="14" y="15" width="2" height="1" fill="#581616" opacity="0.6" />
  </svg>
);

/**
 * Pixel-art Sound Speaker Icon (for unmute toast feedback)
 */
export const PixelSoundIcon: React.FC<{ className?: string; size?: number }> = ({
  className = '',
  size = 16,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block shrink-0 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] ${className}`}
  >
    {/* Speaker cone / body */}
    <rect x="2" y="6" width="3" height="4" fill="#f0b64d" />
    <rect x="5" y="4" width="2" height="8" fill="#f0b64d" />
    <rect x="7" y="2" width="2" height="12" fill="#f0b64d" />
    {/* Pixel sound arcs */}
    <rect x="10" y="5" width="2" height="6" fill="#fae4b5" />
    <rect x="13" y="3" width="2" height="10" fill="#fae4b5" />
    <rect x="12" y="2" width="2" height="1" fill="#d99932" />
    <rect x="12" y="13" width="2" height="1" fill="#d99932" />
  </svg>
);

export const MuteIndicatorOverlay: React.FC<MuteIndicatorOverlayProps> = ({
  soundActive,
  onToggleSound,
}) => {
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    isMuted: boolean;
  } | null>(null);

  const isInitialMount = useRef(true);
  const toastTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    // Skip initial mount so we don't flash toast on page load
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Trigger immediate visual feedback toast
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }

    setToastMessage({
      text: soundActive ? 'AUDIO ENABLED' : 'AUDIO MUTED',
      isMuted: !soundActive,
    });

    toastTimeoutRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 2200);

    return () => {
      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current);
      }
    };
  }, [soundActive]);

  return (
    <>
      {/* 1. Immediate Pop-in Feedback Toast Banner (Animates down on toggle) */}
      {toastMessage && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-300 transform scale-100 opacity-100 animate-bounce">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xs border-2 shadow-[0_6px_20px_rgba(0,0,0,0.85)] ${
              toastMessage.isMuted
                ? 'bg-[#2b1714] border-[#8a3328] text-[#fca5a5]'
                : 'bg-[#212b18] border-[#578536] text-[#bbf7d0]'
            }`}
          >
            {toastMessage.isMuted ? (
              <PixelMuteIcon size={18} />
            ) : (
              <PixelSoundIcon size={18} />
            )}
            <span className="font-pixel text-[11px] tracking-wider uppercase font-bold">
              {toastMessage.text}
            </span>
          </div>
        </div>
      )}

      {/* 2. Persistent Cozy Pixel-Art Overlay Badge when Sound is Muted */}
      {!soundActive && (
        <div className="absolute top-2.5 right-3 z-40 select-none animate-pulse">
          <button
            onClick={onToggleSound}
            className="flex items-center gap-1.5 px-2 py-1 rounded-xs bg-[#241714]/90 border border-[#7d2f25] hover:border-[#a83b2d] hover:bg-[#321e1a] text-[#fca5a5] shadow-[0_2px_8px_rgba(0,0,0,0.6)] cursor-pointer transition-all active:scale-95"
            title="Audio is currently muted. Click to enable 8-bit sound fx."
          >
            <PixelMuteIcon size={14} />
            <span className="font-pixel text-[10px] tracking-wide text-[#f87171] font-bold">
              MUTED
            </span>
          </button>
        </div>
      )}
    </>
  );
};
