import React from 'react';
import { UserProfile, Skill, Quest, CareerRole, ScreenId } from '../../types/career';
import {
  TrendingUp,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Calendar,
  Compass,
  Award,
} from 'lucide-react';

interface ClassicHomeScreenProps {
  user: UserProfile;
  skills: Skill[];
  quests: Quest[];
  roles: CareerRole[];
  onStartQuest: (questId: string) => void;
  onNavigate: (screen: ScreenId) => void;
  onSelectRole: (roleId: string) => void;
}

export const ClassicHomeScreen: React.FC<ClassicHomeScreenProps> = ({
  user,
  skills,
  quests,
  roles,
  onStartQuest,
  onNavigate,
  onSelectRole,
}) => {
  const workshopQuest = quests.find((quest) => !quest.isCompleted) || quests[0];
  const isWorkshopEnrolled = workshopQuest?.isAccepted;
  const targetTitle = [user.targetRole, user.targetGrade].filter(Boolean).join(' · ');
  const topSkills = skills.slice(0, 4).map((skill) => ({ label: skill.name, level: skill.currentLevel, max: skill.maxLevel }));

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-[#fafaf9] text-slate-900 font-sans p-4 space-y-4 select-none">
      {/* 1. Executive Summary Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-emerald-700 tracking-wide uppercase">
            Career Overview
          </span>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">
            Welcome back, {user.name.split(' ')[0]}
          </h1>
          <p className="text-xs text-slate-500">
            {user.tier} · {user.title}
          </p>
        </div>
        <button
          onClick={() => onNavigate('classic_dev_plan')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors shadow-2xs cursor-pointer"
        >
          <Calendar className="w-3.5 h-3.5 text-slate-500" />
          <span>My Plan</span>
        </button>
      </div>

      {/* 2. Primary Readiness Progress Hero Card (Blue Progress Bar & Emerald Accents) */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500">Target Role</div>
            <div className="text-base font-bold text-slate-900">
              {targetTitle || 'Choose a career goal'}
            </div>
          </div>
          <div className="text-right">
            <span className="text-xl font-bold text-blue-600">
              {user.coverageConfigured === false ? 'Not configured' : `${user.progressToSenior}%`}
            </span>
            <div className="text-[11px] text-slate-400 font-medium">Readiness</div>
          </div>
        </div>

        {/* Corporate Blue Progress Bar */}
        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden relative">
          <div
            className="bg-blue-600 h-full rounded-full transition-all duration-700 ease-out"
            style={{ width: `${user.progressToSenior}%` }}
          />
        </div>

        <p className="pt-2 border-t border-slate-100 text-xs text-slate-500">{user.coverageConfigured ? 'Readiness is calculated from verified skills for your selected goal.' : 'Skill requirements have not been configured for this goal.'}</p>
      </div>

      {/* Recommended development activity */}
      {workshopQuest ? <div className="bg-gradient-to-br from-white to-slate-50/80 rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100/80 text-emerald-800 flex items-center justify-center font-bold text-xs">
              <Award className="w-4 h-4 text-emerald-700" />
            </div>
            <div>
              <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                {workshopQuest.isRecommended ? 'Recommended Activity' : 'Your Activity'}
              </div>
              <h2 className="text-sm font-bold text-slate-900">
                {workshopQuest.title}
              </h2>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          {workshopQuest.description}
        </p>

        {/* Impact Metrics Row (Zero-Pills, Clean Metadata) */}
        <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200/60 text-xs">
          <div>
            <span className="text-slate-500 block text-[11px]">Competency Impact</span>
            <span className="font-semibold text-slate-900">
              {workshopQuest.targetSkill}: target {workshopQuest.nextSkillLevel}/5
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[11px]">Verified Proficiency</span>
            <span className="font-semibold text-emerald-700">
              {workshopQuest.currentSkillLevel}/5
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-slate-500">{workshopQuest.duration}</span>
          <button
            disabled={isWorkshopEnrolled || workshopQuest.isCompleted}
            onClick={() => {
              if (workshopQuest && !isWorkshopEnrolled) {
                onStartQuest(workshopQuest.id);
              }
              onNavigate('classic_dev_plan');
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
              isWorkshopEnrolled
                ? 'bg-emerald-100/90 text-emerald-800 hover:bg-emerald-200'
                : 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs'
            }`}
          >
            {isWorkshopEnrolled || workshopQuest.isCompleted ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                <span>{workshopQuest.isCompleted ? 'Completed' : 'Enrolled'}</span>
              </>
            ) : (
              <>
                <span>Enroll in Activity</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div> : <div className="bg-white rounded-2xl p-4 border border-slate-200 text-xs text-slate-500">No recommended activities are available.</div>}

      {/* 4. Core Competencies Snapshot (Clean Bars, Generous Spacing) */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">
            Core Competency Snapshot
          </h2>
          <button
            onClick={() => onNavigate('classic_skills')}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition-colors cursor-pointer"
          >
            View all ({skills.length}) →
          </button>
        </div>

        <div className="space-y-2.5">
          {!topSkills.length && <p className="text-xs text-slate-500">Your skill ledger is empty.</p>}
          {topSkills.map((sk) => (
            <div key={sk.label} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-800">{sk.label}</span>
                <span className="font-semibold text-slate-900">
                  Level {sk.level} of {sk.max}
                </span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full rounded-full transition-all"
                  style={{ width: `${(sk.level / sk.max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Role mobility overview */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Lateral & Vertical Pathways
            </h2>
            <p className="text-xs text-slate-500">
              Target role readiness calculations
            </p>
          </div>
          <button
            onClick={() => onNavigate('classic_career_explorer')}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition-colors cursor-pointer"
          >
            Explore all →
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          {!roles.length && <p className="col-span-3 text-xs text-slate-500">No career roles are available.</p>}
          {roles.map((r) => (
            <div
              key={r.id}
              onClick={() => {
                onSelectRole(r.id);
                onNavigate('classic_role_details');
              }}
              className="p-2.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/70 cursor-pointer transition-colors space-y-1"
            >
              <div className="text-base font-bold text-blue-600">
                {r.coverageConfigured === false ? '—' : `${r.readinessPercentage}%`}
              </div>
              <div className="text-[11px] font-medium text-slate-800 truncate">
                {r.title}
              </div>
              <div className="text-[10px] text-slate-500">Match Score</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
