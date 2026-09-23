import React, { useState } from 'react';
import { Skill, ScreenId, UserProfile, UiMode } from '../../types/career';
import {
  CheckCircle2,
  Clock,
  Plus,
  Search,
  Users,
  ShieldCheck,
  Award,
  Sparkles,
  LayoutDashboard,
  Gamepad2,
  Check,
  SlidersHorizontal,
} from 'lucide-react';
import { soundFx } from '../../utils/audio';

interface ClassicSkillsScreenProps {
  skills: Skill[];
  user?: UserProfile;
  uiMode?: UiMode;
  onSelectMode?: (mode: UiMode) => void;
  onToggleUiMode?: () => void;
  onAddSkill: () => void;
  onRequestVerification: (skillId: string) => void;
  onNavigate: (screen: ScreenId) => void;
}

export const ClassicSkillsScreen: React.FC<ClassicSkillsScreenProps> = ({
  skills,
  user,
  uiMode = 'classic',
  onSelectMode,
  onToggleUiMode,
  onAddSkill,
  onRequestVerification,
  onNavigate,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const isClassic = uiMode === 'classic' || uiMode === 'clean';

  const categories = [
    { id: 'all', label: 'All' },
    { id: 'core', label: 'Core' },
    { id: 'architecture', label: 'Architecture' },
    { id: 'devops', label: 'DevOps' },
    { id: 'leadership', label: 'Leadership' },
    { id: 'data', label: 'Data' },
  ];

  const filteredSkills = skills.filter((skill) => {
    const matchesCat =
      selectedCategory === 'all' || skill.category === selectedCategory;
    const matchesSearch = skill.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const verifiedCount = skills.filter((s) => s.status === 'verified').length;

  const handleSelectClassic = () => {
    soundFx.playSelect();
    if (onSelectMode) {
      onSelectMode('classic');
    }
  };

  const handleSelectRpg = () => {
    soundFx.playSelect();
    if (onSelectMode) {
      onSelectMode('rpg');
    } else if (onToggleUiMode) {
      onToggleUiMode();
    }
    onNavigate('skills');
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-[#fafaf9] text-slate-900 font-sans p-4 space-y-4 select-none">
      {/* 1. Interface Style Setting Card (Profile Screen requirement) */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              Settings & Preferences
            </span>
            <h2 className="text-sm font-bold text-slate-900 mt-0.5">
              Interface Style
            </h2>
            <p className="text-xs text-slate-500">
              Choose how you view your career journey. Both themes share all data.
            </p>
          </div>
          <button
            onClick={() => onNavigate('classic_mode_select')}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
            title="Open Mode Selection Preview"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* Two Selectable Options: Classic and Career RPG */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Option 1: Classic */}
          <div
            onClick={handleSelectClassic}
            className={`p-3 rounded-xl border-2 transition-all cursor-pointer space-y-1.5 ${
              isClassic
                ? 'bg-emerald-50/50 border-emerald-600 shadow-xs ring-1 ring-emerald-600/20'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <LayoutDashboard className="w-4 h-4 text-emerald-700" />
                <span className="text-xs font-bold text-slate-900">Classic</span>
              </div>
              {isClassic && (
                <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 leading-tight">
              Modern cards & professional labels
            </p>
            {isClassic && (
              <span className="inline-block text-[10px] font-semibold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.2 rounded-md">
                Selected
              </span>
            )}
          </div>

          {/* Option 2: Career RPG */}
          <div
            onClick={handleSelectRpg}
            className={`p-3 rounded-xl border-2 transition-all cursor-pointer space-y-1.5 ${
              !isClassic
                ? 'bg-[#2b2118] border-[#d99738] text-[#f7ebd9] shadow-xs'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Gamepad2
                  className={`w-4 h-4 ${
                    !isClassic ? 'text-[#f5c76c]' : 'text-amber-600'
                  }`}
                />
                <span
                  className={`text-xs font-bold ${
                    !isClassic ? 'text-[#fcebc8]' : 'text-slate-900'
                  }`}
                >
                  Career RPG
                </span>
              </div>
              {!isClassic ? (
                <span className="w-4 h-4 rounded-full bg-[#d99738] text-[#241708] flex items-center justify-center font-bold">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </span>
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              )}
            </div>
            <p
              className={`text-[11px] leading-tight ${
                !isClassic ? 'text-[#c4b3a0]' : 'text-slate-500'
              }`}
            >
              Warm, cozy pixel RPG version
            </p>
            {!isClassic ? (
              <span className="inline-block text-[10px] font-semibold text-[#f5c76c] bg-[#3d2c1c] px-1.5 py-0.2 rounded-md border border-[#8e6027]">
                Selected
              </span>
            ) : (
              <span className="inline-block text-[10px] font-medium text-slate-500 hover:text-slate-800">
                Click to switch →
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2. Header & Competency Counts */}
      <div className="flex items-start justify-between">
        <div className="space-y-0.5">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
            Competency Ledger
          </span>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Verified Skills
          </h1>
          <p className="text-xs text-slate-500">
            {verifiedCount} of {skills.length} competencies officially verified
          </p>
        </div>

        <button
          onClick={onAddSkill}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Skill</span>
        </button>
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter competencies by name..."
          className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200/90 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
        />
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 select-none">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3 py-1 rounded-lg text-xs font-medium shrink-0 transition-colors cursor-pointer ${
              selectedCategory === cat.id
                ? 'bg-slate-900 text-white font-semibold shadow-2xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Skills Cards Grid */}
      <div className="space-y-3">
        {!filteredSkills.length && <p className="text-xs text-slate-500">No skills match your filters. Submit evidence to add a skill.</p>}
        {filteredSkills.map((skill) => {
          const isVerified = skill.status === 'verified';
          const isPeerEndorsed = skill.status === 'peer_endorsed';
          const isSelfReported = skill.status === 'self_reported';

          return (
            <div
              key={skill.id}
              className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs space-y-2.5"
            >
              {/* Card Header: Title & Verification Status */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {skill.name}
                  </h3>
                  <p className="text-[11px] text-slate-500 capitalize">
                    Category: {skill.category}
                  </p>
                </div>

                {isVerified && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-md shrink-0">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Verified
                  </span>
                )}
                {isPeerEndorsed && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-800 bg-blue-50 border border-blue-200/80 px-2 py-0.5 rounded-md shrink-0">
                    <Clock className="w-3 h-3 text-blue-600" />
                    Peer Endorsed
                  </span>
                )}
                {isSelfReported && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md shrink-0">
                    Self-Reported
                  </span>
                )}
              </div>

              {/* 5-Step Competency Bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Verified proficiency</span>
                  <span className="font-bold text-slate-900">
                    {skill.currentLevel} / {skill.maxLevel}
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1.5 h-2">
                  {[1, 2, 3, 4, 5].map((lvl) => (
                    <div
                      key={lvl}
                      className={`h-full rounded-full transition-colors ${
                        lvl <= skill.currentLevel
                          ? 'bg-blue-600'
                          : 'bg-slate-100'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Attestation Evidence & Endorsers */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
                <span className="truncate max-w-[220px]">
                  {skill.evidence}
                  {skill.claimedLevel != null && skill.claimedLevel > skill.currentLevel && <span className="block text-amber-700">Claimed: {skill.claimedLevel}/5</span>}
                </span>

                {!skill.pendingReview && (
                  <button
                    onClick={() => onRequestVerification(skill.id)}
                    className="text-emerald-700 hover:text-emerald-800 font-semibold cursor-pointer shrink-0"
                  >
                    Submit Evidence
                  </button>
                )}

                {skill.pendingReview && (
                  <span className="text-amber-700 font-medium italic">
                    Audit Queued
                  </span>
                )}

                {isVerified && (
                  <span className="text-slate-400">
                    {skill.verifiedCount ?? 0} signoffs
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
