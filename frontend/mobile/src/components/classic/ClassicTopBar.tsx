import React from 'react';
import { UserProfile, UiMode, ScreenId } from '../../types/career';
import { Sparkles, SlidersHorizontal } from 'lucide-react';

interface ClassicTopBarProps {
  user: UserProfile;
  title?: string;
  uiMode: UiMode;
  onToggleUiMode: () => void;
  onNavigate: (screen: ScreenId) => void;
  showBackToExplorer?: boolean;
}

export const ClassicTopBar: React.FC<ClassicTopBarProps> = ({
  user,
  title,
  uiMode,
  onToggleUiMode,
  onNavigate,
}) => {
  return (
    <header className="w-full bg-white border-b border-slate-200/90 px-4 py-2.5 shrink-0 z-20 select-none shadow-[0_1px_3px_rgba(0,0,0,0.03)] font-sans">
      <div className="flex items-center justify-between gap-3">
        {/* User Identity / Monogram */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xs tracking-wider shrink-0 shadow-xs border border-emerald-800">
            {user.name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-slate-900 truncate leading-tight">
              {user.name}
            </h1>
            <p className="text-xs text-slate-500 truncate leading-tight mt-0.5">
              {user.title} <span className="text-slate-300">·</span> {user.tier}
            </p>
          </div>
        </div>

        {/* Right Controls: Mode Selector & Mode Toggle */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Open Mode Selection Screen */}
          <button
            onClick={() => onNavigate('classic_mode_select')}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
            title="Display Modes & Settings"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>

          {/* Quick Toggle to Cozy RPG */}
          <button
            onClick={onToggleUiMode}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-amber-300/80 bg-amber-50/80 hover:bg-amber-100 text-amber-900 text-xs font-semibold transition-colors cursor-pointer shadow-xs"
            title="Switch back to Cozy RPG (Stardew-inspired) presentation"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600 fill-amber-500/20" />
            <span>RPG MODE</span>
          </button>
        </div>
      </div>

      {title && (
        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            {title}
          </h2>
          <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
            {user.coverageConfigured === false ? 'Not configured' : `${user.progressToSenior}% Goal Coverage`}
          </span>
        </div>
      )}
    </header>
  );
};
