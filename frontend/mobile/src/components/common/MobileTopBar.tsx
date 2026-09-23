import React from 'react';
import { Sparkles } from 'lucide-react';
import { UserProfile, UiMode } from '../../types/career';
import { soundFx } from '../../utils/audio';
import { PixelMuteIcon, PixelSoundIcon } from './MuteIndicatorOverlay';

interface MobileTopBarProps {
  user: UserProfile;
  uiMode: UiMode;
  onToggleUiMode: () => void;
  title?: string;
  onSoundToggle?: () => void;
  soundActive?: boolean;
}

export const MobileTopBar: React.FC<MobileTopBarProps> = ({
  user,
  uiMode,
  onToggleUiMode,
  title,
  onSoundToggle,
  soundActive = true,
}) => {
  return (
    <div className="w-full bg-[#201a16] border-b-2 border-[#4a3424] px-3.5 py-2.5 shrink-0 z-30 select-none">
      {/* Stardew Status Ribbon: Honey Level Gem, SP & Coins */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* Level Badge in warm carved wood & amber */}
          <div className="flex items-center gap-1 bg-[#2e2318] border border-[#a8742b] px-2 py-0.5 rounded-xs shadow-[0_0_6px_rgba(215,150,50,0.25)]">
            <Sparkles className="w-3.5 h-3.5 text-[#e5a847] fill-[#e5a847]/40" />
            <span className="font-pixel text-xs text-[#fae4b5] font-bold">{user.tier}</span>
          </div>

          <span className="text-[10px] font-mono text-[#b5d3e8]">{user.completedQuestsCount} completed</span>
        </div>

        {/* Right Action Icons: Sound toggle & UI Mode toggle */}
        <div className="flex items-center gap-2">
          {onSoundToggle && (
            <button
              onClick={() => {
                onSoundToggle();
                soundFx.playSelect();
              }}
              className={`p-1 rounded-xs border transition-all cursor-pointer flex items-center justify-center ${
                soundActive
                  ? 'bg-[#2b2118] border-[#8a652f] text-[#fae3b4] hover:bg-[#382b20]'
                  : 'bg-[#2a1714] border-[#7d2f25] text-[#fca5a5] hover:bg-[#341d1a]'
              }`}
              title={soundActive ? 'Mute 8-bit Audio' : 'Unmute 8-bit Audio'}
            >
              {soundActive ? (
                <PixelSoundIcon size={15} />
              ) : (
                <PixelMuteIcon size={15} />
              )}
            </button>
          )}

          <button
            onClick={() => {
              soundFx.playSelect();
              onToggleUiMode();
            }}
            className={`px-1.5 py-0.5 text-[10px] font-pixel border rounded-xs transition-colors cursor-pointer ${
              uiMode === 'rpg'
                ? 'bg-[#3b2b1b] border-[#9c6a2d] text-[#fae4b5] hover:bg-[#4a3521]'
                : 'bg-[#29231e] border-[#57493d] text-[#c9bcaf]'
            }`}
            title="Switch between Cozy RPG and Classic Professional UI"
          >
            {uiMode === 'rpg' ? 'CLASSIC UI' : 'RPG MODE'}
          </button>
        </div>
      </div>

      {title && (
        <div className="mt-1.5 text-center">
          <h2 className="font-pixel text-xs tracking-wider text-[#fae2b1] uppercase font-bold">
            {title}
          </h2>
        </div>
      )}
    </div>
  );
};
