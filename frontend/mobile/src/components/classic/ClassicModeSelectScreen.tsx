import React from 'react';
import { UserProfile, UiMode, ScreenId } from '../../types/career';
import { Sparkles, CheckCircle2, ArrowRight, ShieldCheck } from 'lucide-react';

interface ClassicModeSelectScreenProps {
  user: UserProfile;
  uiMode: UiMode;
  onToggleUiMode: () => void;
  onNavigate: (screen: ScreenId) => void;
}

export const ClassicModeSelectScreen: React.FC<ClassicModeSelectScreenProps> = ({
  user,
  uiMode,
  onToggleUiMode,
  onNavigate,
}) => {
  const isClassic = uiMode === 'classic' || uiMode === 'clean';

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-[#fafaf9] text-slate-900 font-sans p-4 space-y-4 select-none">
      {/* Page Header */}
      <div className="space-y-1">
        <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
          Settings & Presentation
        </span>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          Display Mode Selection
        </h1>
        <p className="text-xs text-slate-600 leading-relaxed">
          Switch between design languages at any time. Your career progression, verified competencies, and active development milestones remain 100% synchronized.
        </p>
      </div>

      {/* Mode Comparison Cards */}
      <div className="space-y-3.5">
        {/* 1. Classic Professional Card */}
        <div
          className={`p-4 rounded-2xl border transition-all ${
            isClassic
              ? 'bg-white border-emerald-600 shadow-md ring-2 ring-emerald-600/10'
              : 'bg-white/80 border-slate-200 hover:border-slate-300 shadow-xs'
          }`}
        >
          <div className="flex items-start justify-between gap-3 mb-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-100/70 text-emerald-800 flex items-center justify-center font-bold text-xs">
                CP
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Classic Professional
                </h2>
                <p className="text-xs text-slate-500">
                  Executive readiness & clean corporate product style
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

          <div className="space-y-2 py-2 border-y border-slate-100 text-xs text-slate-600">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Visual Aesthetic:</span>
              <span className="font-medium text-slate-800">Off-white, soft gray, subtle borders</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Accents:</span>
              <span className="font-medium text-slate-800">Emerald badges & blue progress</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Typography:</span>
              <span className="font-medium text-slate-800">Readable Plus Jakarta Sans</span>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-500">
              Recommended for 1-on-1s and managerial reviews
            </span>
            {!isClassic && (
              <button
                onClick={onToggleUiMode}
                className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Apply Classic
              </button>
            )}
          </div>
        </div>

        {/* 2. Cozy RPG Card */}
        <div
          className={`p-4 rounded-2xl border transition-all ${
            !isClassic
              ? 'bg-[#221b16] border-[#e0a241] shadow-md ring-2 ring-[#e0a241]/20 text-[#f6ebd9]'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
          }`}
        >
          <div className="flex items-start justify-between gap-3 mb-2.5">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                  !isClassic
                    ? 'bg-[#3d2b1c] text-[#f5c76c] border border-[#a8742b]'
                    : 'bg-amber-100 text-amber-900'
                }`}
              >
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h2
                  className={`text-sm font-bold ${
                    !isClassic ? 'text-[#fae4b5]' : 'text-slate-900'
                  }`}
                >
                  Cozy RPG (Stardew-inspired)
                </h2>
                <p
                  className={`text-xs ${
                    !isClassic ? 'text-[#bfae9c]' : 'text-slate-500'
                  }`}
                >
                  Gamified guild progression with 8-bit audio & ambient particles
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

          <div
            className={`space-y-2 py-2 border-y text-xs ${
              !isClassic
                ? 'border-[#3f3024] text-[#d6c4b2]'
                : 'border-slate-100 text-slate-600'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={!isClassic ? 'text-[#a89582]' : 'text-slate-500'}>
                Visual Aesthetic:
              </span>
              <span className="font-medium">Carved wood, warm honey, pixel art</span>
            </div>
            <div className="flex items-center justify-between">
              <span className={!isClassic ? 'text-[#a89582]' : 'text-slate-500'}>
                Features:
              </span>
              <span className="font-medium">8-bit sound fx, floating leaves, level gems</span>
            </div>
            <div className="flex items-center justify-between">
              <span className={!isClassic ? 'text-[#a89582]' : 'text-slate-500'}>
                Typography:
              </span>
              <span className="font-medium">Pixelify Sans & JetBrains Mono</span>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            <span
              className={`text-[11px] ${
                !isClassic ? 'text-[#b39f8c]' : 'text-slate-500'
              }`}
            >
              Recommended for immersive daily motivation
            </span>
            {isClassic && (
              <button
                onClick={onToggleUiMode}
                className="px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Switch to RPG
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Shared Data Guarantee Note */}
      <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl flex items-start gap-2.5">
        <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
        <div className="text-xs text-emerald-900 space-y-1">
          <p className="font-semibold">Shared Unified Career State</p>
          <p className="text-[11px] text-emerald-800 leading-relaxed">
            Your profile ({user.name}, {user.tier} {user.title}), skills, and career goal stay identical across modes.
          </p>
        </div>
      </div>

      {/* Navigation CTA */}
      <button
        onClick={() => onNavigate('classic_home')}
        className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
      >
        <span>Continue to Home Dashboard</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
};
