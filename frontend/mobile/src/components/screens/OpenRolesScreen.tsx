import React, { useState } from 'react';
import { CareerRole, ScreenId } from '../../types/career';
import { PixelCard } from '../common/PixelCard';
import { PixelButton } from '../common/PixelButton';
import { XpProgressBar } from '../common/ProgressBar';
import {
  Briefcase,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Building2,
  FileText,
  KeyRound,
  Shield,
  X,
  Compass,
} from 'lucide-react';
import { soundFx } from '../../utils/audio';

interface OpenRolesScreenProps {
  roles: CareerRole[];
  onNavigate: (screen: ScreenId) => void;
  onSelectRole: (roleId: string) => void;
}

export const OpenRolesScreen: React.FC<OpenRolesScreenProps> = ({
  roles,
  onNavigate,
  onSelectRole,
}) => {
  return (
    <div className="w-full h-full overflow-y-auto px-3.5 py-3 space-y-4 pb-24 select-none">
      {/* Header Banner - Subtle Guild Board */}
      <div className="p-3 rounded-xs bg-[#27201a] border-2 border-[#593e27] shadow-[inset_1px_1px_0_#7a5639,0_3px_8px_rgba(0,0,0,0.4)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-[#e0a443]" />
            <h2 className="font-pixel text-sm text-[#fae5b6] font-bold tracking-wide">
              OPEN INTERNAL ROLES
            </h2>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-xs bg-[#1a1411] border border-[#4a3627] text-[#f5d089]">
            {roles.length} Career Roles
          </span>
        </div>
        <p className="text-xs text-[#cfc0ae] font-sans mt-1">
          Lateral guild mobility contracts. Review match score, verified competency counts, and skill gap roadmaps.
        </p>
      </div>

      {/* THREE VACANCY CARDS STYLED AS SUBTLE GUILD CONTRACTS */}
      <div className="space-y-3.5">
        {roles.map((role) => {
          const isHighReadiness = role.readinessPercentage >= 60;

          return (
            <div
              key={role.id}
              className="relative p-3.5 rounded-xs bg-[#241d17] border-2 border-[#5c422c] shadow-[inset_1px_1px_0_#7a593c,0_4px_12px_rgba(0,0,0,0.5)] space-y-3 transition-colors hover:border-[#8f6943]"
            >
              {/* Guild Contract Header with Seal */}
              <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-[#423122]">
                <div className="flex items-start gap-2.5">
                  {/* Subtle Wax Seal / Contract Stamp Icon */}
                  <div className="w-8 h-8 rounded-xs bg-[#302319] border border-[#7a5433] flex items-center justify-center shrink-0 shadow-inner">
                    <FileText className="w-4 h-4 text-[#e0a443]" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-pixel text-sm font-bold text-[#faf0e3] tracking-wide">
                        {role.title}
                      </h3>
                      <span className="text-[9px] font-pixel px-1.5 py-0.5 rounded-xs bg-[#191411] border border-[#4f3c2e] text-[#d6c7b6]">
                        GUILD CONTRACT
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-[#baa897] font-sans mt-0.5">
                      <Building2 className="w-3.5 h-3.5 text-[#8f7e6f]" />
                      <span>{role.department}</span>
                    </div>
                  </div>
                </div>

                {/* Readiness Match Score */}
                <div className="text-right shrink-0">
                  <span
                    className={`font-pixel text-lg font-bold tabular-nums ${
                      isHighReadiness ? 'text-[#82c488]' : 'text-[#f5ce7a]'
                    }`}
                  >
                    {role.coverageConfigured === false ? '—' : `${role.readinessPercentage}%`}
                  </span>
                  <span className="block text-[10px] text-[#a69685] font-sans">
                    {role.coverageConfigured === false ? 'Requirements not set' : 'Match Readiness'}
                  </span>
                </div>
              </div>

              {/* Clear Readiness Meter & Verified Skills Count */}
              <div>
                <div className="flex items-center justify-between text-xs font-sans mb-1">
                  <span className="flex items-center gap-1 text-[#7ec283] font-mono text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <strong>{role.verifiedCount}</strong> verified skills
                  </span>
                  <span className="text-[#baa897] text-[11px] font-mono">
                    {role.totalSkillsNeeded - role.verifiedCount} missing skills
                  </span>
                </div>

                {/* Progress Meter Bar */}
                <div className="w-full bg-[#16120e] h-2.5 rounded-xs border border-[#4a3627] overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      isHighReadiness
                        ? 'bg-gradient-to-r from-[#4d7d51] to-[#78b37c]'
                        : 'bg-gradient-to-r from-[#b3772d] to-[#e0a443]'
                    }`}
                    style={{ width: `${role.coverageConfigured === false ? 0 : role.readinessPercentage}%` }}
                  />
                </div>
              </div>

              {/* CRITICAL GAPS SECTION WITH RESTRAINED WARNING ICONS */}
              <div className="p-2.5 rounded-xs bg-[#1c1612] border border-[#453427] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-pixel text-[#aa9887] uppercase tracking-wider font-bold">
                    Missing Skill Benchmarks & Gaps:
                  </span>
                  <span className="text-[10px] text-[#baa897] font-sans">
                    Current / Target
                  </span>
                </div>

                {/* Gap Pills with Restrained Warning Icons */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                  {role.gaps.map((gap, idx) => (
                    <div
                      key={idx}
                      className="p-1.5 rounded-xs bg-[#241a15] border border-[#573e2d] flex items-center justify-between text-xs font-sans"
                    >
                      <div className="flex items-center gap-1 min-w-0 pr-1">
                        {/* Restrained warning icon in soft terracotta */}
                        <AlertTriangle className="w-3 h-3 text-[#d9735f] shrink-0" />
                        <span className="font-medium text-[#faede1] truncate text-[11px]">
                          {gap.skill}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-[#f5a798] text-[11px] shrink-0">
                        {gap.current}/{gap.required}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* WHAT UNLOCKS THE ROLE */}
              <div className="p-2 rounded-xs bg-[#201813] border border-[#543e2d] text-xs font-sans flex items-start gap-2 text-[#ded1c0]">
                <KeyRound className="w-3.5 h-3.5 text-[#e5a847] shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <span className="text-[10px] font-pixel text-[#f5ce7a] uppercase block">
                    What Unlocks This Role:
                  </span>
                  <p className="text-[11px] text-[#cfc0ae] leading-snug mt-0.5">
                    {role.unlockCondition}
                  </p>
                </div>
              </div>

              {/* Action Button: View Path or Build Plan */}
              <div className="pt-1">
                <PixelButton variant="secondary" size="md" fullWidth onClick={() => onSelectRole(role.id)} icon={<Compass className="w-4 h-4" />}>SET AS CAREER GOAL</PixelButton>
              </div>
            </div>
          );
        })}
      </div>

      {!roles.length && <PixelCard variant="stone"><p className="text-xs text-[#cfc0ae]">No career roles are currently available.</p></PixelCard>}
    </div>
  );
};
