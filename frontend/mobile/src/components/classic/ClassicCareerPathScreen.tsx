import React, { useState } from 'react';
import { CareerLadderNode, CareerRole, ScreenId } from '../../types/career';
import {
  CheckCircle2,
  ChevronRight,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  GitBranch,
} from 'lucide-react';

interface ClassicCareerPathScreenProps {
  ladder: CareerLadderNode[];
  roles: CareerRole[];
  onNavigate: (screen: ScreenId) => void;
  onSelectRole: (roleId: string) => void;
  onRequestReview?: () => void;
}

export const ClassicCareerPathScreen: React.FC<ClassicCareerPathScreenProps> = ({
  ladder,
  roles,
  onNavigate,
  onSelectRole,
  onRequestReview,
}) => {
  const [expandedNodeId, setExpandedNodeId] = useState<string>(ladder.find((node) => node.status === 'next')?.id || '');

  const current = ladder.find((node) => node.status === 'current');
  const next = ladder.find((node) => node.status === 'next');

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-[#fafaf9] text-slate-900 font-sans p-4 space-y-4 select-none">
      {/* Header */}
      <div className="space-y-1">
        <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
          Career Ladder
        </span>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          Career Progression
        </h1>
        <p className="text-xs text-slate-600 leading-relaxed">
          Grade benchmarks and competency requirements from your career profile.
        </p>
      </div>

      {/* Current Standing Quick Bar */}
      <div className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-sm border border-blue-200">
            {current?.tier || '—'}
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Current Standing</div>
            <div className="text-sm font-bold text-slate-900">
              {current?.title || 'Grade not set'}
            </div>
          </div>
        </div>
        <div className="text-right">
          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md">
            Next: {next?.title || 'No next grade'}
          </span>
        </div>
      </div>

      {/* Progression Ladder Nodes */}
      <div className="space-y-3 relative before:absolute before:top-4 before:bottom-4 before:left-[19px] before:w-0.5 before:bg-slate-200">
        {!ladder.length && <p className="text-xs text-slate-500">No career ladder has been configured.</p>}
        {ladder.map((node) => {
          const isCurrent = node.status === 'current';
          const isNext = node.status === 'next';
          const isCompleted = node.status === 'completed';
          const isExpanded = expandedNodeId === node.id;

          return (
            <div key={node.id} className="relative pl-9">
              {/* Timeline Indicator Dot */}
              <div
                className={`absolute left-2.5 top-3.5 -translate-x-1/2 w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center z-10 ${
                  isCompleted
                    ? 'border-emerald-600 text-emerald-600'
                    : isCurrent
                    ? 'border-blue-600 ring-4 ring-blue-100'
                    : isNext
                    ? 'border-amber-500 ring-2 ring-amber-100'
                    : 'border-slate-300'
                }`}
              >
                {isCompleted && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                {isCurrent && <div className="w-2 h-2 rounded-full bg-blue-600" />}
              </div>

              {/* Node Card */}
              <div
                className={`rounded-2xl border transition-all ${
                  isCurrent
                    ? 'bg-white border-blue-500/80 shadow-xs'
                    : isNext
                    ? 'bg-white border-amber-300/80 shadow-xs'
                    : 'bg-white/80 border-slate-200/90'
                }`}
              >
                <div
                  onClick={() => setExpandedNodeId(isExpanded ? '' : node.id)}
                  className="p-3.5 flex items-center justify-between cursor-pointer"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">
                        {node.title}
                      </h3>
                      {isCurrent && (
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                          Current
                        </span>
                      )}
                      {isNext && (
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md">
                          Next Gate
                        </span>
                      )}
                      {isCompleted && (
                        <span className="text-[10px] font-medium text-emerald-700">
                          Completed
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-1">
                      {node.description}
                    </p>
                  </div>
                  <ChevronRight
                    className={`w-4 h-4 text-slate-400 transition-transform ${
                      isExpanded ? 'rotate-90' : ''
                    }`}
                  />
                </div>

                {/* Expanded Competency Checklist */}
                {isExpanded && (
                  <div className="px-3.5 pb-3.5 pt-1 border-t border-slate-100 space-y-2.5 text-xs">
                    <div className="text-slate-600 text-[11px] font-medium uppercase tracking-wide">
                      Competency Gate Requirements:
                    </div>
                    <div className="space-y-2">
                      {node.requiredSkills.map((req) => {
                        const isMet = req.current >= req.required;
                        return (
                          <div
                            key={req.name}
                            className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200/60"
                          >
                            <span className="font-medium text-slate-800">
                              {req.name}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-slate-500">
                                Required: {req.required}/5
                              </span>
                              <span
                                className={`font-semibold ${
                                  isMet ? 'text-emerald-700' : 'text-amber-700'
                                }`}
                              >
                                Current: {req.current}/5 {isMet ? '✓' : '(Gap)'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {isNext && (
                      <div className="pt-2 flex items-center justify-between">
                        <span className="text-[11px] text-slate-500">
                          Explore activities that address skill gaps.
                        </span>
                        <button
                          onClick={() => onNavigate('classic_dev_plan')}
                          className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors cursor-pointer"
                        >
                          View Growth Activity
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Promotion Review Action CTA */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-slate-900">
            Promotion Review
          </div>
          <span className="text-xs font-semibold text-blue-600">
            Evaluation Request
          </span>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          Request an evaluation of your verified skills against the configured promotion requirements.
        </p>
        <button
          onClick={onRequestReview}
          className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors cursor-pointer text-center"
        >
          Request Promotion Review
        </button>
      </div>
    </div>
  );
};
