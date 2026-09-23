import React, { useState } from 'react';
import { CareerRole, ScreenId } from '../../types/career';
import {
  Briefcase,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Building2,
  DollarSign,
} from 'lucide-react';

interface ClassicCareerExplorerScreenProps {
  roles: CareerRole[];
  onNavigate: (screen: ScreenId) => void;
  onSelectRole: (roleId: string) => void;
}

export const ClassicCareerExplorerScreen: React.FC<ClassicCareerExplorerScreenProps> = ({
  roles,
  onNavigate,
  onSelectRole,
}) => {
  const [filter, setFilter] = useState<'all' | 'ready' | 'gaps'>('all');

  const filteredRoles = roles.filter((role) => {
    if (filter === 'ready') return role.readinessPercentage >= 100;
    if (filter === 'gaps') return role.gaps.length > 0;
    return true;
  });

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-[#fafaf9] text-slate-900 font-sans p-4 space-y-4 select-none">
      {/* Header */}
      <div className="space-y-1">
        <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
          Role Explorer & Mobility
        </span>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          Career Opportunities
        </h1>
        <p className="text-xs text-slate-600 leading-relaxed">
          Internal transfers, lateral specializations, and target leadership profiles benchmarked against your verified skillset.
        </p>
      </div>

      {/* Filter Segmented Control (Allowed Interactive Buttons from Skill) */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
        <button
          onClick={() => setFilter('all')}
          className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            filter === 'all'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          All Pathways ({roles.length})
        </button>
        <button
          onClick={() => setFilter('ready')}
          className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            filter === 'ready'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Ready
        </button>
        <button
          onClick={() => setFilter('gaps')}
          className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            filter === 'gaps'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Skill Gaps
        </button>
      </div>

      {/* Role Cards List */}
      <div className="space-y-3.5">
        {!filteredRoles.length && <p className="text-xs text-slate-500">No roles match this filter.</p>}
        {filteredRoles.map((role) => (
          <div
            key={role.id}
            onClick={() => {
              onSelectRole(role.id);
              onNavigate('classic_role_details');
            }}
            className="bg-white rounded-2xl p-4 border border-slate-200/90 hover:border-slate-300 shadow-xs transition-all cursor-pointer space-y-3"
          >
            {/* Top Bar: Title & Readiness */}
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  {role.department}
                </span>
                <h2 className="text-base font-bold text-slate-900 mt-0.5">
                  {role.title}
                </h2>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-blue-600">
                  {role.coverageConfigured === false ? '—' : `${role.readinessPercentage}%`}
                </span>
                <div className="text-[10px] text-slate-400 font-medium">{role.coverageConfigured === false ? 'Requirements not set' : 'Readiness'}</div>
              </div>
            </div>

            {/* Corporate Blue Progress Bar */}
            <div className="space-y-1">
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full rounded-full transition-all"
                  style={{ width: `${role.coverageConfigured === false ? 0 : role.readinessPercentage}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>
                  {role.verifiedCount} of {role.totalSkillsNeeded} competencies met
                </span>
                <span>{role.salaryBand}</span>
              </div>
            </div>

            {/* Critical Competency Gaps Row */}
            <div className="pt-2 border-t border-slate-100 space-y-1.5">
              <span className="text-[11px] font-medium text-slate-500 block">
                Primary Skill Gaps:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {role.gaps.map((gap) => (
                  <span
                    key={gap.skill}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] ${
                      gap.isCritical
                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {gap.isCritical && (
                      <AlertCircle className="w-3 h-3 text-amber-600" />
                    )}
                    {gap.skill}: {gap.current}/{gap.required}
                  </span>
                ))}
              </div>
            </div>

            {/* Action Footer */}
            <div className="pt-2 flex items-center justify-between text-xs">
              <span className="text-slate-500 text-[11px] line-clamp-1">
                {role.unlockCondition.slice(0, 45)}...
              </span>
              <span className="font-semibold text-emerald-700 flex items-center gap-1 shrink-0">
                <span>View Details</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
