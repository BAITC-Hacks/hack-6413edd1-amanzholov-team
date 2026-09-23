import React from 'react';
import { Quest } from '../../types/career';
import { PixelCard } from '../common/PixelCard';
import { PixelButton } from '../common/PixelButton';
import { Scroll, Check, Clock, Sparkles } from 'lucide-react';

interface RecommendedQuestsScreenProps {
  quests: Quest[];
  onAcceptQuest: (questId: string) => void;
  acceptedQuestIds: string[];
}

export const RecommendedQuestsScreen: React.FC<RecommendedQuestsScreenProps> = ({ quests, onAcceptQuest, acceptedQuestIds }) => (
  <div className="w-full h-full overflow-y-auto px-3.5 py-3 space-y-4 pb-24 select-none">
    <div className="p-3 rounded-xs bg-[#27201a] border-2 border-[#593e27] shadow-[inset_1px_1px_0_#7a5639,0_3px_8px_rgba(0,0,0,0.4)]">
      <div className="flex items-center gap-2"><Scroll className="w-4 h-4 text-[#e0a443]" /><h2 className="font-pixel text-sm text-[#fae5b6] font-bold">GUILD QUESTS</h2></div>
      <p className="text-xs text-[#cfc0ae] mt-1">Recommended activities for your career goal. Skills are credited after completion and review.</p>
    </div>
    {!quests.length && <PixelCard variant="stone"><p className="text-xs text-[#cfc0ae]">No activities are available for your current goal.</p></PixelCard>}
    {quests.map((quest, index) => {
      const accepted = quest.isAccepted || acceptedQuestIds.includes(quest.id);
      return (
        <PixelCard key={quest.id} variant={index === 0 ? 'gold' : 'stone'} className="space-y-3">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-pixel text-[#e0a443] uppercase">{quest.type}</span>
            <span className="text-[#baa897] flex items-center gap-1"><Clock className="w-3 h-3" />{quest.duration}</span>
          </div>
          {quest.isRecommended && <span className="font-pixel text-[10px] text-[#e0a443]">RECOMMENDED</span>}
          <h3 className="font-pixel text-sm text-[#faede1] font-bold">{quest.title}</h3>
          <p className="text-xs text-[#cfc1b0] leading-relaxed">{quest.description}</p>
          <div className="p-2.5 rounded-xs bg-[#1c1612] border border-[#453427] text-xs text-[#ded1c0]">
            <span className="flex items-center gap-1 text-[#fad287]"><Sparkles className="w-3.5 h-3.5" />{quest.targetSkill}</span>
            <p className="mt-1">Verified level: {quest.currentSkillLevel}/5 · Activity target: {quest.nextSkillLevel}/5</p>
            {quest.prerequisites.length > 0 && <p className="text-[#aa9887] mt-1">{quest.prerequisites.join(' · ')}</p>}
          </div>
          {quest.recommendationReasons?.length ? <ul className="text-xs text-[#baa897] space-y-1">{quest.recommendationReasons.map((reason, index) => <li key={index}>{reason}</li>)}</ul> : null}
          <PixelButton variant={accepted ? 'secondary' : 'emerald'} fullWidth disabled={accepted || quest.isCompleted} onClick={() => onAcceptQuest(quest.id)} icon={accepted || quest.isCompleted ? <Check className="w-4 h-4" /> : undefined}>
            {quest.isCompleted ? 'COMPLETED' : accepted ? 'ENROLLED' : 'ACCEPT QUEST'}
          </PixelButton>
        </PixelCard>
      );
    })}
  </div>
);
