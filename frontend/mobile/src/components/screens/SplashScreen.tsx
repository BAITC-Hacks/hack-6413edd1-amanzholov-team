import React from 'react';
import portalImage from '../../assets/images/stardew_adventurer_portal_1790162988782.jpg';
import crestImage from '../../assets/images/cozy_guild_crest_1790163020661.jpg';
import { PixelButton } from '../common/PixelButton';
import { Sparkles, Compass, Settings, SlidersHorizontal } from 'lucide-react';
import { UiMode, ScreenId } from '../../types/career';

interface SplashScreenProps {
  onStartJourney: () => void;
  onContinue: () => void;
  uiMode: UiMode;
  onToggleUiMode: () => void;
  onNavigate?: (screen: ScreenId) => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onStartJourney,
  onContinue,
  uiMode,
  onToggleUiMode,
  onNavigate,
}) => {
  return (
    <div className="relative w-full h-full flex flex-col justify-between overflow-hidden bg-[#181411] text-[#f2e6d6] select-none">
      {/* Background Cozy Pastoral Portal Art */}
      <div className="absolute inset-0 z-0">
        <img
          src={portalImage}
          alt="Cozy Stardew Adventurer Portal"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover opacity-65 scale-105 transition-transform duration-1000"
        />
        {/* Soft Warm Vignettes & Gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#181411] via-[#181411]/60 to-[#181411]/85" />
        <div className="absolute inset-0 bg-radial from-transparent via-[#181411]/30 to-[#181411]" />
      </div>

      {/* Top Bar / Mode Indicator */}
      <div className="relative z-10 p-4 pt-6 flex items-center justify-between">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xs bg-[#2b221a]/85 border border-[#8a5d33] backdrop-blur-xs">
          <span className="w-2.5 h-2.5 rounded-full bg-[#d6963c] inline-block" />
          <span className="font-pixel text-[11px] text-[#f5dfb8]">VALLEY GUILD REGISTRY</span>
        </div>

        <button
          onClick={() => {
            if (onNavigate) {
              onNavigate('classic_mode_select');
            } else {
              onToggleUiMode();
            }
          }}
          className="flex items-center gap-1 px-2.5 py-1 rounded-xs bg-[#2b211b]/90 border border-[#6e5038] text-[11px] font-pixel text-[#d6c7b6] hover:text-[#fae5be] transition-colors cursor-pointer"
          title="Choose display mode"
        >
          <SlidersHorizontal className="w-3 h-3 text-[#c2965d]" />
          <span>MODE: {uiMode.toUpperCase()}</span>
        </button>
      </div>

      {/* Center Branding & Hero */}
      <div className="relative z-10 px-6 text-center my-auto flex flex-col items-center">
        {/* Cozy Wooden Crest Plaque */}
        <div className="relative mb-3">
          <div className="w-22 h-22 rounded-xs p-1.5 border-3 border-[#875529] shadow-[0_4px_16px_rgba(0,0,0,0.5),inset_1px_1px_0_#bd864e] bg-[#291f17]/95 flex items-center justify-center">
            <img
              src={crestImage}
              alt="Cozy Guild Crest"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover rounded-xs"
            />
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#4c7c50] border border-[#7fb383] rounded-xs flex items-center justify-center shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-[#fff7e6]" />
          </div>
        </div>

        {/* Main Title */}
        <h1 className="font-pixel text-3xl sm:text-4xl text-transparent bg-clip-text bg-gradient-to-b from-[#ffeed1] via-[#f7cb79] to-[#d69333] drop-shadow-[0_2px_4px_rgba(30,18,8,0.9)] tracking-wider">
          CAREER QUEST
        </h1>

        {/* Cozy Tagline */}
        <p className="font-sans text-sm text-[#e0cfbe] mt-2 max-w-[280px] font-medium leading-relaxed">
          Turn your career path into an <span className="text-[#fce09d] font-semibold">epic journey</span>.
        </p>

        {/* Level Progression Indicator */}
        <div className="mt-5 px-3.5 py-1.5 rounded-xs bg-[#2b2119]/85 border border-[#6b4c30] text-xs font-mono text-[#ecd8b8] flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#528756]" />
          <span>Your career profile is ready</span>
        </div>
      </div>

      {/* Bottom Action Area */}
      <div className="relative z-10 p-6 pb-8 space-y-3 bg-gradient-to-t from-[#181411] via-[#181411]/90 to-transparent">
        <PixelButton
          variant="primary"
          size="lg"
          fullWidth
          onClick={onStartJourney}
          icon={<Compass className="w-5 h-5 text-[#2b1706]" />}
        >
          START JOURNEY
        </PixelButton>

        <PixelButton
          variant="secondary"
          size="md"
          fullWidth
          onClick={onContinue}
        >
          CONTINUE SESSION
        </PixelButton>

        <PixelButton
          variant="secondary"
          size="sm"
          fullWidth
          onClick={() => {
            if (onNavigate) {
              onNavigate('classic_mode_select');
            } else {
              onToggleUiMode();
            }
          }}
          icon={<SlidersHorizontal className="w-3.5 h-3.5 text-[#e5a847]" />}
        >
          CHOOSE INTERFACE STYLE
        </PixelButton>

        {/* Settings hint */}
        <div className="pt-2 text-center">
          <p className="text-[11px] text-[#a69482] font-sans">
            UI Mode: <span className="text-[#f2caa0] font-mono font-bold">{uiMode === 'rpg' ? 'Career RPG' : 'Classic'}</span> (change anytime in Settings)
          </p>
        </div>
      </div>
    </div>
  );
};
