import React from 'react';
import { UserProfile, UiMode, ScreenId } from '../../types/career';
import { Sparkles, CheckCircle2, ArrowRight, ShieldCheck, Check, LayoutDashboard, Gamepad2 } from 'lucide-react';
import { soundFx } from '../../utils/audio';

interface ModeSelectionScreenProps {
  user: UserProfile;
  uiMode: UiMode;
  onSelectMode: (mode: UiMode) => void;
  onNavigate: (screen: ScreenId) => void;
}

export const ModeSelectionScreen: React.FC<ModeSelectionScreenProps> = ({
  user,
  uiMode,
  onSelectMode,
  onNavigate,
}) => {
  const isClassic = uiMode === 'classic' || uiMode === 'clean';

  const handleSelectClassic = () => {
    soundFx.playSelect();
    onSelectMode('classic');
    onNavigate('classic_home');
  };

  const handleSelectRpg = () => {
    soundFx.playSelect();
    onSelectMode('rpg');
    onNavigate('home');
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-[#fafaf9] text-slate-900 font-sans p-4 space-y-4 select-none">
      {/* Required Heading & Note */}
      <div className="space-y-1.5 pt-1">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-tight">
          How would you like to view your career?
        </h1>
        <p className="text-xs text-slate-600 leading-relaxed">
          You can change this anytime in Settings.
        </p>
      </div>

      {/* Shared Employee Data Indicator */}
      <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl flex items-center gap-2.5">
        <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
        <div className="text-[11px] text-emerald-900 leading-tight">
          <span className="font-bold">{user.name}</span> ({user.tier} {user.title}) ·{' '}
          <span className="font-semibold text-emerald-700">{user.coverageConfigured === false ? 'Requirements not configured' : `${user.progressToSenior}% Goal Coverage`}</span> · All data stays 100% in sync.
        </div>
      </div>

      {/* Mode Comparison Cards */}
      <div className="space-y-3.5">
        {/* 1. Classic Preview Card */}
        <div
          className={`p-4 rounded-2xl border transition-all ${
            isClassic
              ? 'bg-white border-emerald-600 shadow-md ring-2 ring-emerald-600/10'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
          }`}
        >
          {/* Card Top / Header */}
          <div className="flex items-start justify-between gap-3 mb-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shadow-2xs">
                <LayoutDashboard className="w-4 h-4 text-emerald-700" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h2 className="text-sm font-bold text-slate-900">Classic</h2>
                  {isClassic && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-md">
                      Current
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  Modern cards & professional labels
                </p>
              </div>
            </div>
            {isClassic && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Active
              </span>
            )}
          </div>

          {/* Visual Mini Preview / Feature Mapping */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/70 space-y-1.5 text-xs text-slate-700">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500 font-medium">Design Style:</span>
              <span className="font-semibold text-slate-900">Off-white, soft gray, emerald & blue</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500 font-medium">Labels:</span>
              <span className="font-semibold text-slate-800">Home, Career Path, Skills, Dev Plan</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500 font-medium">Navigation:</span>
              <span className="font-semibold text-slate-800">Home, Career, Activities, Jobs, Profile</span>
            </div>
          </div>

          {/* Required "Use Classic" button */}
          <div className="mt-3.5 flex items-center justify-between gap-3">
            <span className="text-[11px] text-slate-500">
              Clean executive presentation
            </span>
            <button
              onClick={handleSelectClassic}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                isClassic
                  ? 'bg-emerald-700 text-white shadow-xs hover:bg-emerald-800'
                  : 'bg-slate-900 text-white hover:bg-slate-800 shadow-xs'
              }`}
            >
              {isClassic && <Check className="w-3.5 h-3.5" />}
              <span>Use Classic</span>
            </button>
          </div>
        </div>

        {/* 2. Career RPG Preview Card */}
        <div
          className={`p-4 rounded-2xl border transition-all ${
            !isClassic
              ? 'bg-[#221b16] border-[#d99738] shadow-md ring-2 ring-[#d99738]/20 text-[#f6ebd9]'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
          }`}
        >
          {/* Card Top / Header */}
          <div className="flex items-start justify-between gap-3 mb-2.5">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shadow-2xs ${
                  !isClassic
                    ? 'bg-[#3b2a1a] text-[#f7ca6f] border border-[#a8742b]'
                    : 'bg-amber-100 text-amber-900'
                }`}
              >
                <Gamepad2 className="w-4 h-4 text-[#f0b64d]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h2
                    className={`text-sm font-bold ${
                      !isClassic ? 'text-[#fae4b5]' : 'text-slate-900'
                    }`}
                  >
                    Career RPG
                  </h2>
                  {!isClassic && (
                    <span className="text-[10px] font-bold text-[#f7ca6f] bg-[#3a2818] border border-[#8e6027] px-1.5 py-0.2 rounded-md">
                      Current
                    </span>
                  )}
                </div>
                <p
                  className={`text-xs ${
                    !isClassic ? 'text-[#c2b19e]' : 'text-slate-500'
                  }`}
                >
                  Warm, cozy pixel RPG version
                </p>
              </div>
            </div>
            {!isClassic && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#f5c76c] bg-[#362719] px-2 py-0.5 rounded-full border border-[#8e6027]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Active
              </span>
            )}
          </div>

          {/* Visual Mini Preview / Feature Mapping */}
          <div
            className={`rounded-xl p-3 border space-y-1.5 text-xs ${
              !isClassic
                ? 'bg-[#1a1410] border-[#3f3024] text-[#d6c4b2]'
                : 'bg-slate-50 border-slate-200/70 text-slate-700'
            }`}
          >
            <div className="flex items-center justify-between text-[11px]">
              <span className={!isClassic ? 'text-[#a89582]' : 'text-slate-500'}>
                Design Style:
              </span>
              <span className="font-semibold">Carved wood, warm honey, 8-bit audio</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className={!isClassic ? 'text-[#a89582]' : 'text-slate-500'}>
                Labels:
              </span>
              <span className="font-semibold">RPG Hero, Career Map, Quests, Guild Roles</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className={!isClassic ? 'text-[#a89582]' : 'text-slate-500'}>
                Navigation:
              </span>
              <span className="font-semibold">Home, Map, Quests, Jobs, Profile</span>
            </div>
          </div>

          {/* Required "Try RPG" button */}
          <div className="mt-3.5 flex items-center justify-between gap-3">
            <span
              className={`text-[11px] ${
                !isClassic ? 'text-[#b39f8c]' : 'text-slate-500'
              }`}
            >
              Stardew-inspired cozy progression
            </span>
            <button
              onClick={handleSelectRpg}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                !isClassic
                  ? 'bg-[#d99738] hover:bg-[#ebaa46] text-[#241708] font-bold shadow-xs'
                  : 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs'
              }`}
            >
              {!isClassic && <Check className="w-3.5 h-3.5" />}
              <Sparkles className="w-3.5 h-3.5" />
              <span>Try RPG</span>
            </button>
          </div>
        </div>
      </div>

      {/* Feature Correspondence Matrix */}
      <div className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-xs space-y-2">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
          Feature Equivalents
        </h3>
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
            <div className="text-slate-400 font-medium">Classic View</div>
            <div className="font-semibold text-slate-800 mt-0.5">Classic Home</div>
            <div className="font-semibold text-slate-800">Career Path</div>
            <div className="font-semibold text-slate-800">Skills Ledger</div>
            <div className="font-semibold text-slate-800">Development Plan</div>
            <div className="font-semibold text-slate-800">Open Roles</div>
          </div>
          <div className="p-2 rounded-lg bg-amber-50/50 border border-amber-100">
            <div className="text-amber-800/60 font-medium">Career RPG</div>
            <div className="font-semibold text-amber-900 mt-0.5">RPG Hero</div>
            <div className="font-semibold text-amber-900">Career Map</div>
            <div className="font-semibold text-amber-900">Skills Ledger</div>
            <div className="font-semibold text-amber-900">Guild Quests</div>
            <div className="font-semibold text-amber-900">Guild Roles</div>
          </div>
        </div>
      </div>

      {/* Quick Dismiss Button */}
      <button
        onClick={() => {
          soundFx.playSelect();
          onNavigate(isClassic ? 'classic_home' : 'home');
        }}
        className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
      >
        <span>Back to {isClassic ? 'Classic Home' : 'RPG Hero'}</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
