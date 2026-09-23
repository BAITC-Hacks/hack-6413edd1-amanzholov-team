import React from 'react';
import { Quest, UserProfile, ScreenId } from '../../types/career';
import {
  CalendarCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  Award,
  Users,
  Target,
} from 'lucide-react';

interface ClassicDevPlanScreenProps {
  user: UserProfile;
  quests: Quest[];
  onStartQuest: (questId: string) => void;
  onNavigate: (screen: ScreenId) => void;
}

export const ClassicDevPlanScreen: React.FC<ClassicDevPlanScreenProps> = ({
  user,
  quests,
  onStartQuest,
  onNavigate,
}) => {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-[#fafaf9] text-slate-900 font-sans p-4 space-y-4 select-none">
      {/* Header */}
      <div className="space-y-1">
        <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
          Individual Growth
        </span>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          Development Plan
        </h1>
        <p className="text-xs text-slate-600 leading-relaxed">
          Activities selected for your development goal. Verified skills are updated after completion and review.
        </p>
      </div>

      {/* Target Role Progress Snapshot */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500">
              Career Goal
            </div>
            <div className="text-sm font-bold text-slate-900">
              {[user.targetRole, user.targetGrade].filter(Boolean).join(' · ') || 'Choose a career goal'}
            </div>
          </div>
          <span className="text-lg font-bold text-blue-600">
            {user.coverageConfigured === false ? 'Not configured' : `${user.progressToSenior}%`}
          </span>
        </div>

        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
          <div
            className="bg-blue-600 h-full rounded-full transition-all duration-500"
            style={{ width: `${user.progressToSenior}%` }}
          />
        </div>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
          <span className="flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span>Verified skill coverage</span>
          </span>
          <span className="font-semibold text-emerald-700">
            {user.coverageConfigured ? `${user.progressToSenior}%` : 'Not configured'}
          </span>
        </div>
      </div>

      {/* Development Activities List */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
          Active & Recommended Growth Activities
        </h2>

        {!quests.length && <p className="text-xs text-slate-500">No activities are currently available.</p>}
        {quests.map((activity) => {
          const isEnrolled = activity.isAccepted;
          const isSystemDesign = activity.id === quests[0]?.id;

          return (
            <div
              key={activity.id}
              className={`rounded-2xl p-4 border transition-all space-y-3 ${
                isSystemDesign
                  ? 'bg-gradient-to-br from-white to-emerald-50/30 border-emerald-300/80 shadow-xs'
                  : 'bg-white border-slate-200/90 shadow-xs'
              }`}
            >
              {/* Activity Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                      {activity.type}
                    </span>
                    <span className="text-xs text-slate-500">
                      {activity.duration}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mt-1">
                    {activity.title}
                  </h3>
                </div>

                {isEnrolled && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100/70 px-2.5 py-1 rounded-md shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Enrolled
                  </span>
                )}
              </div>

              {/* Description */}
              <p className="text-xs text-slate-600 leading-relaxed">
                {activity.description}
              </p>

              {/* Impact Breakdown Matrix */}
              <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50/80 rounded-xl border border-slate-200/60 text-xs">
                <div>
                  <span className="text-slate-500 block text-[11px]">
                    Target Competency
                  </span>
                  <span className="font-semibold text-slate-900">
                    {activity.targetSkill}: {activity.currentSkillLevel} → {activity.nextSkillLevel}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">
                    Verified Level
                  </span>
                  <span className="font-semibold text-emerald-700">
                    {activity.currentSkillLevel}/5
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-500">
                  {activity.prerequisites.join(' · ')}
                </span>

                <button
                  disabled={isEnrolled || activity.isCompleted}
                  onClick={() => onStartQuest(activity.id)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                    isEnrolled
                      ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      : 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs'
                  }`}
                >
                  {isEnrolled || activity.isCompleted ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                      <span>{activity.isCompleted ? 'Completed' : 'Enrolled'}</span>
                    </>
                  ) : (
                    <>
                      <span>Enroll in Activity</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
