import React from 'react';
import { X, Layers } from 'lucide-react';
import { PixelButton } from '../common/PixelButton';
import { PixelBadge } from '../common/PixelBadge';
import { XpProgressBar, SkillPips } from '../common/ProgressBar';
import { RankNode } from '../common/RankNode';
import { CareerLadderNode } from '../../types/career';

interface ComponentSpecsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ComponentSpecsDrawer: React.FC<ComponentSpecsDrawerProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const mockNode: CareerLadderNode = {
    id: 'spec_node',
    title: 'Middle+ Engineer',
    tier: 'Middle+',
    status: 'next',
    levelRequirement: 30,
    requiredSkills: [
      { name: 'System Design', required: 3, current: 2 },
      { name: 'Leadership', required: 2, current: 2 },
    ],
    description: 'Upcoming evaluation rank milestone.',
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-xl bg-[#1d1713] border-l-2 border-[#57402e] h-full overflow-y-auto p-6 text-[#f2e6d6] shadow-2xl select-none">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#473424]">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#e5a847]" />
            <div>
              <h2 className="font-pixel text-base text-[#fcebc8] font-bold">
                COZY DESIGN SYSTEM & TOKENS
              </h2>
              <p className="text-xs text-[#a89685] font-sans">
                Stardew Valley Inspired 390×844 Mobile Spec
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xs bg-[#2e231b] text-[#ab9a89] hover:text-[#fff] cursor-pointer border border-[#523d2d]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-6 space-y-8">
          {/* Section 1: Button States */}
          <div className="space-y-3">
            <h3 className="font-pixel text-xs text-[#e5a847] uppercase tracking-wider flex items-center gap-1.5">
              <span>01. Button States & Cozy Materials</span>
            </h3>
            <div className="p-4 rounded-xs bg-[#261f1a] border border-[#543e2d] space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-[#aa9887] font-mono block mb-1">Honey Primary</span>
                  <PixelButton variant="primary" size="sm" fullWidth>
                    ACTION
                  </PixelButton>
                </div>
                <div>
                  <span className="text-[10px] text-[#aa9887] font-mono block mb-1">Clover Quest</span>
                  <PixelButton variant="emerald" size="sm" fullWidth>
                    ACCEPT QUEST
                  </PixelButton>
                </div>
                <div>
                  <span className="text-[10px] text-[#aa9887] font-mono block mb-1">Carved Timber</span>
                  <PixelButton variant="secondary" size="sm" fullWidth>
                    SECONDARY
                  </PixelButton>
                </div>
                <div>
                  <span className="text-[10px] text-[#aa9887] font-mono block mb-1">Warm Parchment</span>
                  <PixelButton variant="parchment" size="sm" fullWidth>
                    SCROLL
                  </PixelButton>
                </div>
                <div>
                  <span className="text-[10px] text-[#aa9887] font-mono block mb-1">Disabled</span>
                  <PixelButton variant="primary" state="disabled" size="sm" fullWidth>
                    DISABLED
                  </PixelButton>
                </div>
                <div>
                  <span className="text-[10px] text-[#aa9887] font-mono block mb-1">Locked Milestone</span>
                  <PixelButton variant="primary" state="locked" size="sm" fullWidth>
                    LOCKED
                  </PixelButton>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Badges & Status Chips */}
          <div className="space-y-3">
            <h3 className="font-pixel text-xs text-[#e5a847] uppercase tracking-wider">
              02. Status Chips & Verification Badges (Muted Earth Tones)
            </h3>
            <div className="p-4 rounded-xs bg-[#261f1a] border border-[#543e2d] flex flex-wrap gap-2.5">
              <PixelBadge status="verified" label="Verified (Soft Clover)" />
              <PixelBadge status="peer_endorsed" label="Peer Endorsed (Mountain Blue)" />
              <PixelBadge status="self_reported" label="Self-Reported (Tea Straw)" />
              <PixelBadge status="warning" label="Critical Gap (Autumn Terracotta)" />
              <PixelBadge status="locked" label="Locked (Weathered Timber)" />
              <PixelBadge status="selected" label="Active Track (Honey)" />
            </div>
          </div>

          {/* Section 3: Progress Bars & Skill Pips */}
          <div className="space-y-3">
            <h3 className="font-pixel text-xs text-[#e5a847] uppercase tracking-wider">
              03. Progress Troughs & Diamond Skill Pips
            </h3>
            <div className="p-4 rounded-xs bg-[#261f1a] border border-[#543e2d] space-y-4">
              <div>
                <span className="text-[11px] text-[#baa897] font-sans block mb-1">
                  Clover Moss Senior Progress Trough
                </span>
                <XpProgressBar current={72} max={100} percentage={72} color="emerald" height="md" />
              </div>

              <div>
                <span className="text-[11px] text-[#baa897] font-sans block mb-1">
                  Honey Beeswax Role Readiness Trough
                </span>
                <XpProgressBar current={58} max={100} percentage={58} color="amber" height="sm" />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#403124]">
                <span className="text-xs text-[#ded1c0] font-sans">Diamond Skill Pip (4/5 Amber)</span>
                <SkillPips level={4} maxLevel={5} variant="gold" size="md" />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-[#ded1c0] font-sans">Diamond Skill Pip (2/5 Jade Clover)</span>
                <SkillPips level={2} maxLevel={5} variant="emerald" size="md" />
              </div>
            </div>
          </div>

          {/* Section 4: Rank Node */}
          <div className="space-y-3">
            <h3 className="font-pixel text-xs text-[#e5a847] uppercase tracking-wider">
              04. Progression Signpost
            </h3>
            <div className="p-4 rounded-xs bg-[#261f1a] border border-[#543e2d]">
              <RankNode node={mockNode} />
            </div>
          </div>

          {/* Section 5: Palette Tokens */}
          <div className="space-y-3">
            <h3 className="font-pixel text-xs text-[#e5a847] uppercase tracking-wider">
              05. Stardew Earth & Flora Color Tokens
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
              <div className="p-2.5 bg-[#191512] border border-[#473424] rounded-xs">
                <span className="block font-bold text-[#faf0e3]">Hearth Midnight</span>
                <span className="text-[10px] text-[#9c8978]">#191512</span>
              </div>
              <div className="p-2.5 bg-[#28211b] border border-[#5c3e27] rounded-xs">
                <span className="block font-bold text-[#faf0e3]">Carved Timber</span>
                <span className="text-[10px] text-[#9c8978]">#28211b</span>
              </div>
              <div className="p-2.5 bg-[#d49436] text-[#241505] font-bold rounded-xs">
                <span>Honey Beeswax</span>
                <span className="block text-[10px] text-[#4d2f09]">#d49436</span>
              </div>
              <div className="p-2.5 bg-[#4e7d51] text-[#fff] font-bold rounded-xs">
                <span>Clover Moss</span>
                <span className="block text-[10px] text-[#1b361e]">#4e7d51</span>
              </div>
              <div className="p-2.5 bg-[#4e7591] text-[#fff] font-bold rounded-xs">
                <span>Mountain Lake</span>
                <span className="block text-[10px] text-[#1a2d3b]">#4e7591</span>
              </div>
              <div className="p-2.5 bg-[#fdf7eb] text-[#2d1e13] font-bold rounded-xs">
                <span>Linen Parchment</span>
                <span className="block text-[10px] text-[#735133]">#fdf7eb</span>
              </div>
              <div className="p-2.5 bg-[#b55845] text-[#fff] font-bold rounded-xs">
                <span>Autumn Clay</span>
                <span className="block text-[10px] text-[#42160d]">#b55845</span>
              </div>
              <div className="p-2.5 bg-[#7d603a] text-[#fff] font-bold rounded-xs">
                <span>Harvest Straw</span>
                <span className="block text-[10px] text-[#332311]">#7d603a</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
