import React from 'react';
import { CareerRole, Quest, ScreenId } from '../../types/career';
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Building2,
  DollarSign,
  TrendingUp,
  Award,
  ArrowRight,
} from 'lucide-react';

interface ClassicRoleDetailsScreenProps {
  role?: CareerRole;
  quests: Quest[];
  onNavigate: (screen: ScreenId) => void;
  onStartQuest: (questId: string) => void;
  onSelectRole: (roleId: string) => void;
}

export const ClassicRoleDetailsScreen: React.FC<ClassicRoleDetailsScreenProps> = ({
  role,
  quests,
  onNavigate,
  onStartQuest,
  onSelectRole,
}) => {
  if (!role) return <div className="p-4 text-sm text-slate-500">No career role is selected.</div>;
  const bridgeQuest = quests.find((quest) => role.gaps.some((gap) => gap.skill === quest.targetSkill));

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-[#fafaf9] text-slate-900 font-sans p-4 space-y-4 select-none">
      {/* Back Navigation Bar */}
      <button
        onClick={() => onNavigate('classic_career_explorer')}
        className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Career Explorer</span>
      </button>

      {/* Role Title & Meta Hero Card */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" />
              {role.department}
            </div>
            <h1 className="text-lg font-bold text-slate-900 mt-0.5">
              {role.title}
            </h1>
            <div className="text-xs text-slate-500 mt-0.5">
              {role.salaryBand || role.unlockCondition}
            </div>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-blue-600">
              {role.coverageConfigured === false ? '—' : `${role.readinessPercentage}%`}
            </span>
            <div className="text-[10px] text-slate-400 font-medium">{role.coverageConfigured === false ? 'Requirements not set' : 'Match Score'}</div>
          </div>
        </div>

        {/* Corporate Blue Progress Bar */}
        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
          <div
            className="bg-blue-600 h-full rounded-full transition-all"
            style={{ width: `${role.coverageConfigured === false ? 0 : role.readinessPercentage}%` }}
          />
        </div>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
          <span>{role.verifiedCount} of {role.totalSkillsNeeded} required competencies verified</span>
          <span className="font-semibold text-emerald-700">
            {role.gaps.length} Target Gaps
          </span>
        </div>
      </div>

      {/* Detailed Gap Analysis */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs space-y-3">
        <h2 className="text-sm font-bold text-slate-900">
          Competency Gap Breakdown
        </h2>
        <p className="text-xs text-slate-500">
          Requirements compared with your verified skills.
        </p>

        <div className="space-y-2">
          {!role.gaps.length && <p className="text-xs text-slate-500">No skill gaps are listed for this role.</p>}
          {role.gaps.map((gap) => (
            <div
              key={gap.skill}
              className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                gap.isCritical
                  ? 'bg-amber-50/70 border-amber-200/90 text-amber-900'
                  : 'bg-slate-50 border-slate-200/80 text-slate-800'
              }`}
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 font-bold">
                  {gap.isCritical && (
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  )}
                  <span>{gap.skill}</span>
                  {gap.isCritical && (
                    <span className="text-[10px] uppercase font-bold text-amber-700 bg-amber-100/80 px-1.5 py-0.2 rounded-xs">
                      Critical
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500">
                  Target Proficiency: Level {gap.required}/5
                </div>
              </div>

              <div className="text-right">
                <div className="font-bold text-slate-900">
                  {gap.current} / {gap.required}
                </div>
                <div className="text-[10px] text-slate-500">Current Standing</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recommended Bridge Activity Card */}
      {bridgeQuest && (
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
              <Award className="w-4 h-4 text-emerald-700" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                Recommended Bridge Activity
              </span>
              <h3 className="text-sm font-bold text-slate-900">
                {bridgeQuest.title}
              </h3>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            {bridgeQuest.description}
          </p>

          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/60 flex items-center justify-between text-xs">
            <span className="text-slate-600">Target: {bridgeQuest.targetSkill}</span>
            <span className="font-bold text-emerald-700">
              Level {bridgeQuest.currentSkillLevel} → {bridgeQuest.nextSkillLevel}
            </span>
          </div>

          <button
            disabled={bridgeQuest.isAccepted || bridgeQuest.isCompleted}
            onClick={() => {
              onStartQuest(bridgeQuest.id);
              onNavigate('classic_dev_plan');
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
          >
            <span>{bridgeQuest.isCompleted ? 'Completed' : bridgeQuest.isAccepted ? 'Enrolled' : 'Add to Development Plan'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Action Footer */}
      <div className="space-y-2">
        <button
          onClick={() => onSelectRole(role.id)}
          className="w-full py-2.5 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-xs transition-colors cursor-pointer text-center"
        >
          Set as Career Goal
        </button>
      </div>
    </div>
  );
};
