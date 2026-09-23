import React, { useState } from 'react';
import { CareerLadderNode, CareerRole, ScreenId } from '../../types/career';
import { PixelCard } from '../common/PixelCard';
import { PixelButton } from '../common/PixelButton';
import { Compass, Check, Lock, ChevronRight, GitBranch } from 'lucide-react';

interface CareerMapScreenProps {
  ladder: CareerLadderNode[];
  branches: CareerRole[];
  onNavigate: (screen: ScreenId) => void;
  onSelectRole: (roleId: string) => void;
}

export const CareerMapScreen: React.FC<CareerMapScreenProps> = ({ ladder, branches, onNavigate, onSelectRole }) => {
  const [inspectNodeId, setInspectNodeId] = useState<string | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const current = ladder.find((node) => node.status === 'current');
  const next = ladder.find((node) => node.status === 'next');
  return (
    <div className="w-full h-full overflow-y-auto px-3.5 py-3 space-y-4 pb-24 select-none">
      <div className="p-3 rounded-xs bg-[#27201a] border-2 border-[#593e27] shadow-[inset_1px_1px_0_#7a5639,0_3px_8px_rgba(0,0,0,0.4)]">
        <h2 className="font-pixel text-sm text-[#fae5b6] font-bold flex items-center gap-2"><Compass className="w-4 h-4 text-[#e0a443]" />CAREER MAP & GUILD PATHS</h2>
        <p className="text-xs text-[#cfc0ae] mt-1">Current: {current?.title || 'Grade not set'} · {ladder.length} milestones</p>
      </div>
      {next && <PixelCard variant="stone" className="space-y-2">
        <h3 className="font-pixel text-xs text-[#fad287] font-bold">NEXT GRADE: {next.title}</h3>
        <p className="text-xs text-[#cfc0ae]">{next.description}</p>
        {next.requiredSkills.filter((skill) => skill.current < skill.required).map((skill) => <div key={skill.name} className="p-2 bg-[#1f1511] border border-[#823c2d] text-xs text-[#f5a798]">{skill.name}: verified {skill.current}/5 · required {skill.required}/5</div>)}
        <PixelButton size="sm" variant="secondary" onClick={() => onNavigate('quests')}>VIEW ACTIVITIES</PixelButton>
      </PixelCard>}
      {!ladder.length && <PixelCard variant="stone"><p className="text-xs text-[#cfc0ae]">Career ladder requirements have not been configured.</p></PixelCard>}
      <div className="relative pl-6 space-y-3">
        {ladder.length > 0 && <div className="absolute left-[13px] top-4 bottom-4 w-1 bg-gradient-to-b from-[#4d7d51] via-[#d69539] to-[#45372d]" />}
        {ladder.map((node) => {
          const open = inspectNodeId === node.id;
          return <div key={node.id} className="relative">
            <div className="absolute -left-5 top-3 w-4 h-4 rounded-full border border-[#b88235] bg-[#36271a] flex items-center justify-center text-[#fae5b6]">{node.status === 'completed' ? <Check className="w-3 h-3" /> : node.status === 'locked' ? <Lock className="w-2.5 h-2.5" /> : <span className="w-1.5 h-1.5 rounded-full bg-[#e0a443]" />}</div>
            <PixelCard variant={node.status === 'current' ? 'gold' : 'stone'}>
              <button className="w-full flex items-center justify-between text-left" onClick={() => setInspectNodeId(open ? null : node.id)} aria-expanded={open}>
                <div><h3 className="font-pixel text-xs font-bold text-[#faede1]">{node.title}</h3><p className="text-[10px] text-[#baa897] uppercase mt-1">{node.status}</p></div><ChevronRight className={`w-4 h-4 text-[#e0a443] ${open ? 'rotate-90' : ''}`} />
              </button>
              {open && <div className="mt-3 space-y-2 text-xs text-[#cfc0ae]"><p>{node.description}</p>{!node.requiredSkills.length && <p>No competency requirements configured.</p>}{node.requiredSkills.map((skill) => <div key={skill.name} className="p-2 bg-[#1c1612] border border-[#453427] flex justify-between gap-2"><span>{skill.name}</span><span className={skill.current >= skill.required ? 'text-[#82c488]' : 'text-[#f5a798]'}>{skill.current} / {skill.required}</span></div>)}</div>}
            </PixelCard>
          </div>;
        })}
      </div>
      <h3 className="font-pixel text-xs text-[#e0a443] flex gap-2 items-center"><GitBranch className="w-4 h-4" />ROLE PATHS ({branches.length})</h3>
      {branches.map((role) => <PixelCard key={role.id} variant="dark" className="space-y-2">
        <button className="w-full flex justify-between gap-2 text-left font-pixel text-xs text-[#fae5b6]" aria-expanded={selectedBranchId === role.id} onClick={() => setSelectedBranchId(selectedBranchId === role.id ? null : role.id)}><span>{role.title}</span><span>{role.coverageConfigured === false ? '—' : `${role.readinessPercentage}%`}</span></button>
        {selectedBranchId === role.id && <div className="space-y-2 text-xs text-[#cfc0ae]"><p>{role.unlockCondition}</p>{role.gaps.map((gap) => <p key={gap.skill}>{gap.skill}: {gap.current}/{gap.required}</p>)}<PixelButton size="sm" variant="secondary" fullWidth onClick={() => onSelectRole(role.id)}>SET AS CAREER GOAL</PixelButton></div>}
      </PixelCard>)}
      {!branches.length && <p className="text-xs text-[#cfc0ae]">No role paths are available.</p>}
    </div>
  );
};
