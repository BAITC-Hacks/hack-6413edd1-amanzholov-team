import React from 'react';
import { Check, Lock, Sparkles, ChevronRight } from 'lucide-react';
import { CareerLadderNode } from '../../types/career';

interface RankNodeProps {
  node: CareerLadderNode;
  isActive?: boolean;
  onClick?: () => void;
}

export const RankNode: React.FC<RankNodeProps> = ({ node, isActive, onClick }) => {
  const isCurrent = node.status === 'current';
  const isCompleted = node.status === 'completed';
  const isNext = node.status === 'next';
  const isLocked = node.status === 'locked';

  let statusBg = 'bg-[#261f1a] border-[#4a3a2e] text-[#a19385]';
  let badgeLabel = 'LOCKED';
  let badgeColor = 'bg-[#1e1915] text-[#918476] border-[#3d3228]';

  if (isCompleted) {
    statusBg =
      'bg-[#1f2b20] border-[#4b7a4f] text-[#d6edd9] shadow-[inset_1px_1px_0_#7bb380]';
    badgeLabel = 'MASTERED';
    badgeColor = 'bg-[#172418] text-[#7eb883] border-[#38613c]';
  } else if (isCurrent) {
    statusBg =
      'bg-[#362617] border-[#d4983b] text-[#faedd7] shadow-[0_0_12px_rgba(215,150,55,0.25),inset_2px_2px_0_#f7d692]';
    badgeLabel = 'CURRENT RANK';
    badgeColor = 'bg-[#291b0e] text-[#f7d692] border-[#b07823] font-bold';
  } else if (isNext) {
    statusBg =
      'bg-[#1d2730] border-[#4b7796] text-[#d6e7f2] shadow-[0_0_8px_rgba(75,120,150,0.2)]';
    badgeLabel = 'NEXT MILESTONE';
    badgeColor = 'bg-[#141e26] text-[#7da8c9] border-[#355873]';
  }

  return (
    <div
      onClick={onClick}
      className={`relative p-3 rounded-xs border-2 transition-all cursor-pointer select-none ${statusBg} ${
        isActive ? 'ring-2 ring-[#e5a847] ring-offset-2 ring-offset-[#1b1612]' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-xs border-2 flex items-center justify-center shrink-0 ${
              isCompleted
                ? 'bg-[#49784e] border-[#7cb381] text-[#fbf6eb]'
                : isCurrent
                ? 'bg-[#d69639] border-[#fae29c] text-[#241505] shadow-[0_0_8px_#fae29c]'
                : isNext
                ? 'bg-[#4d7899] border-[#8cb5d6] text-[#fbf6eb]'
                : 'bg-[#2d2520] border-[#473b33] text-[#736559]'
            }`}
          >
            {isCompleted && <Check className="w-4 h-4 stroke-[3]" />}
            {isCurrent && <Sparkles className="w-4 h-4 stroke-[2.5]" />}
            {isNext && <span className="font-pixel font-bold text-xs">GO</span>}
            {isLocked && <Lock className="w-3.5 h-3.5 text-[#7a6d61]" />}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-pixel text-sm text-[#f5ebd9] font-bold">{node.title}</h4>
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded-xs border font-pixel uppercase tracking-wider ${badgeColor}`}
              >
                {badgeLabel}
              </span>
            </div>
            <p className="text-xs text-[#c7b7a5] font-sans mt-0.5">{node.description}</p>
          </div>
        </div>

        <ChevronRight className="w-4 h-4 text-[#8a7b6e] shrink-0 mt-2" />
      </div>

      {/* Skill requirements micro list */}
      <div className="mt-2.5 pt-2 border-t border-[#42352a]/70 flex flex-wrap gap-2 text-[11px] font-sans">
        {node.requiredSkills.map((req, idx) => {
          const isSatisfied = req.current >= req.required;
          return (
            <span
              key={idx}
              className={`px-1.5 py-0.5 rounded-xs border font-mono ${
                isSatisfied
                  ? 'bg-[#1b261c] border-[#385e3b] text-[#97cca0]'
                  : 'bg-[#331f1a] border-[#69392e] text-[#e89d8f]'
              }`}
            >
              {req.name}: {req.current}/{req.required}
            </span>
          );
        })}
      </div>
    </div>
  );
};
