import React, { useState } from 'react';
import { Skill, ScreenId, UiMode } from '../../types/career';
import { PixelCard } from '../common/PixelCard';
import { PixelButton } from '../common/PixelButton';
import { SkillPips } from '../common/ProgressBar';
import {
  Plus,
  Send,
  CheckCircle2,
  Users,
  HelpCircle,
  Filter,
  ShieldCheck,
  Award,
  Clock,
  Sparkles,
  LayoutDashboard,
  Gamepad2,
  Check,
  SlidersHorizontal,
} from 'lucide-react';
import { soundFx } from '../../utils/audio';

interface SkillsLedgerScreenProps {
  skills: Skill[];
  onAddSkill: () => void;
  onRequestVerification: (skillId: string) => void;
  onRequestReview: () => void;
  onNavigate: (screen: ScreenId) => void;
  uiMode?: UiMode;
  onSelectMode?: (mode: UiMode) => void;
  onToggleUiMode?: () => void;
}

export const SkillsLedgerScreen: React.FC<SkillsLedgerScreenProps> = ({
  skills,
  onAddSkill,
  onRequestVerification,
  onRequestReview,
  onNavigate,
  uiMode = 'rpg',
  onSelectMode,
  onToggleUiMode,
}) => {
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Counts reflect the employee ledger returned by the server.
  const verifiedCount = skills.filter((s) => s.status === 'verified').length;
  const peerCount = skills.filter((s) => s.status === 'peer_endorsed').length;
  const selfReportedCount = skills.filter((s) => s.status === 'self_reported').length;

  const displayedOtherSkills = skills.filter((skill) => filterCategory === 'all' || skill.category === filterCategory);

  // Helper for status badge with distinct written label and icon (not relying on color alone)
  const renderStatusBadge = (status: Skill['status']) => {
    if (status === 'verified') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-sans font-bold px-2 py-0.5 rounded-xs bg-[#192b1b] border border-[#48784d] text-[#d6edd8]">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#73ad77] shrink-0" />
          <span>[✓ VERIFIED]</span>
        </span>
      );
    }
    if (status === 'peer_endorsed') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-sans font-bold px-2 py-0.5 rounded-xs bg-[#172633] border border-[#41698a] text-[#d1e5f5]">
          <Users className="w-3.5 h-3.5 text-[#6b9cc2] shrink-0" />
          <span>[👥 PEER ENDORSED]</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-sans font-bold px-2 py-0.5 rounded-xs bg-[#2e2317] border border-[#7d603a] text-[#f5e3cd]">
        <HelpCircle className="w-3.5 h-3.5 text-[#c79c5f] shrink-0" />
        <span>[📝 SELF REPORTED]</span>
      </span>
    );
  };

  return (
    <div className="w-full h-full overflow-y-auto px-3.5 py-3 space-y-4 pb-24 select-none">
      {/* Interface Style Setting for RPG Profile */}
      <div className="p-3 rounded-xs bg-[#241c16] border-2 border-[#66482e] shadow-[inset_1px_1px_0_#875f3d,0_3px_8px_rgba(0,0,0,0.45)] space-y-2.5">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-pixel text-[10px] text-[#e0a443] uppercase tracking-wider">
              PROFILE SETTINGS
            </div>
            <h3 className="font-pixel text-sm text-[#fcebc8] font-bold">
              INTERFACE STYLE
            </h3>
          </div>
          <button
            onClick={() => {
              soundFx.playSelect();
              onNavigate('classic_mode_select');
            }}
            className="flex items-center gap-1 px-2 py-1 rounded-xs bg-[#36271c] hover:bg-[#473426] border border-[#7d5635] text-[10px] font-pixel text-[#fae2b8] transition-colors cursor-pointer"
          >
            <SlidersHorizontal className="w-3 h-3 text-[#e0a443]" />
            <span>PREVIEW THEMES</span>
          </button>
        </div>

        {/* Two Selectable Options: Classic and Career RPG */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {/* Option 1: Classic */}
          <div
            onClick={() => {
              soundFx.playSelect();
              if (onSelectMode) {
                onSelectMode('classic');
              } else if (onToggleUiMode) {
                onToggleUiMode();
              }
              onNavigate('classic_skills');
            }}
            className="p-2.5 rounded-xs bg-[#1f1915] border-2 border-[#574333] hover:border-[#8f6d4d] cursor-pointer transition-all space-y-1"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <LayoutDashboard className="w-3.5 h-3.5 text-slate-300" />
                <span className="font-sans font-bold text-slate-200 text-xs">Classic</span>
              </div>
              <span className="text-[10px] text-slate-400">Switch →</span>
            </div>
            <p className="text-[10px] text-[#a19080] font-sans leading-tight">
              Modern cards & professional labels
            </p>
          </div>

          {/* Option 2: Career RPG */}
          <div
            onClick={() => {
              soundFx.playSelect();
              if (onSelectMode) {
                onSelectMode('rpg');
              }
            }}
            className="p-2.5 rounded-xs bg-[#362618] border-2 border-[#e0a443] shadow-[0_0_8px_rgba(224,164,67,0.2)] cursor-pointer transition-all space-y-1"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Gamepad2 className="w-3.5 h-3.5 text-[#f5c76c]" />
                <span className="font-pixel font-bold text-[#fed684] text-xs">Career RPG</span>
              </div>
              <span className="text-[9px] font-pixel text-[#241708] bg-[#e0a443] px-1 py-0.2 rounded-xs font-bold">
                ACTIVE ✓
              </span>
            </div>
            <p className="text-[10px] text-[#eedbc8] font-sans leading-tight">
              Warm, cozy pixel RPG version
            </p>
          </div>
        </div>
      </div>

      {/* Header & Verification Power Banner */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-5 h-5 text-[#e0a443]" />
              <h2 className="font-pixel text-base text-[#fcebc8] font-bold">
                SKILLS LEDGER
              </h2>
            </div>
            <p className="text-[11px] text-[#aa9887] font-sans">
              Competency audit registry & peer attestations
            </p>
          </div>

          {/* Action Button: Add Skill */}
          <PixelButton
            variant="secondary"
            size="sm"
            onClick={onAddSkill}
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            ADD SKILL
          </PixelButton>
        </div>

        {/* Verification Power Scoreboard Box */}
        <div className="p-3 rounded-xs bg-[#251e18] border-2 border-[#573e2a] shadow-[inset_1px_1px_0_#755337,0_3px_8px_rgba(0,0,0,0.4)]">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#3d2e20]">
            <span className="font-pixel text-xs text-[#fae5b6] uppercase font-bold tracking-wide flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#e5a847]" />
              VERIFICATION POWER
            </span>
            <span className="text-[10px] font-mono text-[#a89887]">
              Total: {skills.length} Competencies
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {/* Verified */}
            <div className="p-2 rounded-xs bg-[#192b1b] border border-[#48784d] text-center shadow-xs">
              <div className="flex items-center justify-center gap-1 text-[#78b37c] mb-0.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="font-pixel text-base font-bold tabular-nums">
                  {verifiedCount}
                </span>
              </div>
              <span className="text-[10px] font-pixel text-[#d6edd8] block uppercase">
                Verified
              </span>
            </div>

            {/* 3 Peer Endorsed */}
            <div className="p-2 rounded-xs bg-[#162533] border border-[#40688a] text-center shadow-xs">
              <div className="flex items-center justify-center gap-1 text-[#6f9fbf] mb-0.5">
                <Users className="w-3.5 h-3.5" />
                <span className="font-pixel text-base font-bold tabular-nums">
                  {peerCount}
                </span>
              </div>
              <span className="text-[10px] font-pixel text-[#cfe3f2] block uppercase">
                Endorsed
              </span>
            </div>

            {/* 2 Self Reported */}
            <div className="p-2 rounded-xs bg-[#2b2116] border border-[#785934] text-center shadow-xs">
              <div className="flex items-center justify-center gap-1 text-[#c79b5c] mb-0.5">
                <HelpCircle className="w-3.5 h-3.5" />
                <span className="font-pixel text-base font-bold tabular-nums">
                  {selfReportedCount}
                </span>
              </div>
              <span className="text-[10px] font-pixel text-[#faebd7] block uppercase">
                Reported
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Ledger records and category filters */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-pixel text-[#aa9887] uppercase">
            Competency Records ({displayedOtherSkills.length})
          </span>
          <div className="flex items-center gap-1 text-[11px] text-[#aa9887] font-mono">
            <Filter className="w-3 h-3" />
            <span>Filter</span>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar">
          {[
            { id: 'all', label: 'All' },
            { id: 'core', label: 'Core' },
            { id: 'architecture', label: 'Architecture' },
            { id: 'devops', label: 'DevOps' },
            { id: 'leadership', label: 'Leadership' },
            { id: 'data', label: 'Data' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                soundFx.playSelect();
                setFilterCategory(cat.id);
              }}
              className={`px-2.5 py-1 text-xs font-pixel rounded-xs transition-colors whitespace-nowrap cursor-pointer border ${
                filterCategory === cat.id
                  ? 'bg-[#d69539] border-[#fad58c] text-[#261504] font-bold shadow-xs'
                  : 'bg-[#241e19] border-[#4f3d2f] text-[#aa9988] hover:text-[#faebd7]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Extended Scrollable Ledger Cards */}
        <div className="space-y-2">
          {!displayedOtherSkills.length && <p className="text-xs text-[#cfc0ae] p-2">No skills match this category. Submit evidence for a skill to start your ledger.</p>}
          {displayedOtherSkills.map((skill) => (
            <div
              key={skill.id}
              className="p-2.5 rounded-xs bg-[#241d18] border border-[#4d3a2b] flex items-center justify-between text-xs"
            >
              <div className="min-w-0 pr-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-sans font-bold text-[#faede1] truncate">
                    {skill.name}
                  </span>
                  {renderStatusBadge(skill.status)}
                </div>
                <p className="text-[11px] text-[#aa9887] font-sans truncate mt-0.5">
                  {skill.evidence}
                </p>
                {skill.claimedLevel != null && skill.claimedLevel > skill.currentLevel && <p className="text-[10px] text-[#e0a443] mt-1">Claimed: {skill.claimedLevel}/5 · Verified: {skill.currentLevel}/5</p>}
                {skill.pendingReview ? <p className="text-[10px] text-[#e0a443] mt-1">Review pending</p> : <button onClick={() => onRequestVerification(skill.id)} className="text-[10px] text-[#f5d089] font-pixel mt-2">SUBMIT EVIDENCE</button>}
              </div>

              <SkillPips
                level={skill.currentLevel}
                maxLevel={skill.maxLevel}
                size="sm"
                variant={skill.status === 'verified' ? 'emerald' : 'gold'}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Sticky Action Bar: Request Review */}
      <div className="pt-2">
        <PixelButton
          variant="primary"
          size="md"
          fullWidth
          onClick={onRequestReview}
          icon={<Send className="w-4 h-4 text-[#2b1706]" />}
        >
          REQUEST REVIEW
        </PixelButton>
        <p className="text-[10px] text-center text-[#998877] mt-1.5 font-sans">
          Requests a promotion review against the configured grade requirements.
        </p>
      </div>
    </div>
  );
};
