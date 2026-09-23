import React from 'react';
import { UserProfile, Skill, Quest, ScreenId } from '../../types/career';
import { PixelCard } from '../common/PixelCard';
import { XpProgressBar, SkillPips } from '../common/ProgressBar';
import { PixelButton } from '../common/PixelButton';
import { PixelBadge } from '../common/PixelBadge';
import { Scroll, Sparkles, ArrowUpRight, Compass, ShieldCheck } from 'lucide-react';

interface HomeScreenProps {
  user: UserProfile;
  skills: Skill[];
  featuredQuest?: Quest;
  onStartQuest: (questId: string) => void;
  onNavigate: (screen: ScreenId) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  user,
  skills,
  featuredQuest,
  onStartQuest,
  onNavigate,
}) => {
  const homeSkills = skills.slice(0, 4);
  const targetTitle = [user.targetRole, user.targetGrade].filter(Boolean).join(' · ');

  return (
    <div className="w-full h-full overflow-y-auto px-4 py-3 space-y-4 pb-24 select-none">
      {/* Adventurer Identity Banner - Warm Honey Wood Frame */}
      <PixelCard variant="gold" className="relative overflow-hidden">
        <div className="flex items-center gap-3">
          {/* Pixel Avatar Frame with Cozy Wood Trim */}
          <div className="relative shrink-0">
            <div className="w-16 h-16 rounded-xs border-2 border-[#b57d2b] overflow-hidden bg-[#241a13] shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
              {user.avatarUrl ? <img
                src={user.avatarUrl}
                alt={user.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              /> : <span aria-label={user.name} className="w-full h-full flex items-center justify-center text-[#fcebc8] font-pixel text-xl font-bold">{user.name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</span>}
            </div>
            <div className="absolute -bottom-1 -right-1 bg-[#d49437] border border-[#2b1b0b] px-1 py-0.2 rounded-xs">
              <span className="font-pixel text-[9px] text-[#2b1807] font-bold">{user.tier}</span>
            </div>
          </div>

          {/* Adventurer Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 className="font-pixel text-base text-[#fcebc8] font-bold truncate">
                {user.name}
              </h2>
              <span className="text-[10px] font-pixel px-1.5 py-0.5 rounded-xs bg-[#3d2c1c] border border-[#785734] text-[#f5dab0]">
                {user.tier}
              </span>
            </div>

            <p className="text-xs text-[#ddcfbe] font-sans font-medium mt-0.5">
              {user.title}
            </p>

            <div className="flex items-center gap-2 mt-1.5 text-[11px] font-mono text-[#f0cca1]">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#639b69]" />
                {user.guildRank}
              </span>
            </div>
          </div>
        </div>

        {/* Promotion XP Gauge */}
        <div className="mt-3.5 pt-3 border-t border-[#694824]/60">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-pixel text-[#fae3be] font-bold tracking-wide">
              {targetTitle || 'CHOOSE A CAREER GOAL'}
            </span>
            <span className="font-mono text-[#f5d089] text-xs font-bold">
              {user.coverageConfigured === false ? 'Not configured' : `${user.progressToSenior}%`}
            </span>
          </div>
          <XpProgressBar
            current={user.currentXp}
            max={user.xpToNextLevel}
            percentage={user.progressToSenior}
            color="emerald"
            height="md"
            showValues={false}
          />
          <div className="flex items-center justify-between text-[11px] text-[#baa691] font-sans mt-1">
            <span>Standing: {user.tier}</span>
            <span className="text-[#84be8a] font-mono">{user.coverageConfigured ? 'Verified skill coverage' : 'Requirements not configured'}</span>
          </div>
        </div>
      </PixelCard>

      {/* Core Skills Snapshot */}
      <PixelCard variant="stone">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-[#d99f43]" />
            <h3 className="font-pixel text-xs text-[#f5ebd9] font-bold uppercase tracking-wider">
              Core Aptitudes ({skills.length})
            </h3>
          </div>
          <button
            onClick={() => onNavigate('skills')}
            className="text-[11px] text-[#e8be78] hover:text-[#fae1b1] font-pixel flex items-center gap-0.5 cursor-pointer"
          >
            VIEW ALL <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>

        <div className="space-y-2">
          {!homeSkills.length && <p className="text-xs text-[#cfc0ae]">Your skill ledger is empty.</p>}
          {homeSkills.map((skill) => (
            <div
              key={skill.id}
              className="flex items-center justify-between p-2 rounded-xs bg-[#1f1a16] border border-[#423427]"
            >
              <div className="min-w-0 pr-2">
                <div className="flex items-center gap-1.5">
                  <span className="font-sans text-xs font-semibold text-[#f0e3d1] truncate">
                    {skill.name}
                  </span>
                  {skill.status === 'verified' && (
                    <PixelBadge status="verified" size="sm" />
                  )}
                  {skill.status === 'peer_endorsed' && (
                    <PixelBadge status="peer_endorsed" size="sm" />
                  )}
                </div>
                <p className="text-[10px] text-[#a69685] font-sans truncate mt-0.5">
                  {skill.evidence}
                </p>
              </div>

              <SkillPips
                level={skill.currentLevel}
                maxLevel={skill.maxLevel}
                size="sm"
                variant={skill.currentLevel >= 4 ? 'gold' : 'emerald'}
              />
            </div>
          ))}
        </div>
      </PixelCard>

      {/* Active Quest Spotlight: Architecture Guardian (Soft Clover Green) */}
      {featuredQuest ? <PixelCard variant="emerald" className="relative">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-pixel uppercase tracking-wider px-1.5 py-0.5 rounded-xs bg-[#182619] border border-[#3e6642] text-[#c7e8cb]">
            {featuredQuest.type} QUEST
          </span>
          <span className="font-mono text-xs text-[#d2edd6] font-bold">
            {featuredQuest.duration}
          </span>
        </div>

        <h4 className="font-pixel text-sm font-bold text-[#f7fff8] mt-1 flex items-center gap-1.5">
          <Scroll className="w-4 h-4 text-[#80bc85]" />
          {featuredQuest.title}
        </h4>

        <p className="text-xs text-[#e1efe3] font-sans mt-1 leading-relaxed">
          {featuredQuest.description}
        </p>

        {/* Quest Impact Stat */}
        <div className="mt-2.5 p-2 rounded-xs bg-[#142115] border border-[#3b5e3e] flex items-center justify-between text-xs">
          <span className="text-[#cce2cf] font-sans">
            Skill: <strong className="text-[#a4dda9] font-mono">{featuredQuest.targetSkill}</strong>
          </span>
          <span className="font-mono text-[#a4dda9] font-bold">
            Target: {featuredQuest.nextSkillLevel}/5
          </span>
        </div>

        <div className="mt-3 flex gap-2">
          <PixelButton
            variant="emerald"
            size="md"
            fullWidth
            disabled={featuredQuest.isAccepted || featuredQuest.isCompleted}
            onClick={() => onStartQuest(featuredQuest.id)}
            icon={<Sparkles className="w-4 h-4" />}
          >
            {featuredQuest.isCompleted ? 'COMPLETED' : featuredQuest.isAccepted ? 'ENROLLED' : 'START QUEST'}
          </PixelButton>
        </div>
      </PixelCard> : <PixelCard variant="stone"><p className="text-xs text-[#cfc0ae]">No recommended activities are available.</p></PixelCard>}

      <PixelCard variant="dark" className="border-[#634832]">
        <div className="flex items-center gap-1.5 text-[#cf9948]"><Compass className="w-4 h-4" /><h4 className="font-pixel text-xs font-bold">CAREER PATHS</h4></div>
        <p className="text-xs text-[#cfc0ae] mt-2">Explore role requirements and choose your next goal.</p>
        <PixelButton className="mt-3" variant="secondary" size="sm" fullWidth onClick={() => onNavigate('roles')}>VIEW CAREER PATHS</PixelButton>
      </PixelCard>
    </div>
  );
};
